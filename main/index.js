require('dotenv').config();

const { app, BrowserWindow, shell, Notification } = require('electron');
const path = require('path');
const database = require('./database');
const { createTray, setRecordingState } = require('./tray');
const hotkey = require('./hotkey');
const recorder = require('./recorder');
const { transcribe } = require('./transcriber');
const { cleanupText } = require('./cleaner');
const { pasteText } = require('./paster');
const { isCommand, executeCommand } = require('./commands');
const { matchSnippet } = require('./snippets');
const { getContext } = require('./context');
const { registerHandlers } = require('./ipc-handlers');
const { getDb } = require('./database');

let settingsWindow = null;
let overlayWindow = null;
let isProcessing = false;

// App state
const State = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
};
let currentState = State.IDLE;

// Prevent multiple instances
const gotSingleLock = app.requestSingleInstanceLock();
if (!gotSingleLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
  }
});

app.whenReady().then(() => {
  // Hide dock icon — menu bar app only
  if (app.dock) {
    app.dock.hide();
  }

  // Initialize database
  database.initialize();

  // Register IPC handlers
  registerHandlers();

  // Create tray
  const menuCallbacks = {
    onSettingsClick: () => createSettingsWindow(),
    onQuitClick: () => app.quit(),
    onToggleRecording: () => toggleRecording(),
  };
  createTray(menuCallbacks);

  // Register global hotkey
  hotkey.register(() => toggleRecording());

  // Check for first launch
  const apiKey = database.getSetting('groq_api_key') || process.env.GROQ_API_KEY;
  if (!apiKey) {
    createSettingsWindow(true);
  }

  console.log('[AbhiFlow] App ready. Press Cmd+Shift+Space to start dictating.');
});

app.on('will-quit', () => {
  hotkey.unregisterAll();
  database.close();
});

app.on('window-all-closed', (e) => {
  // Don't quit when all windows close — it's a menu bar app
  e.preventDefault();
});

// --- Windows ---

function createSettingsWindow(showOnboarding = false) {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 700,
    height: 550,
    title: 'AbhiFlow Settings',
    resizable: true,
    minimizable: true,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load React app
  const isDev = !app.isPackaged;
  if (isDev) {
    settingsWindow.loadURL('http://localhost:5173');
  } else {
    settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
  }

  if (showOnboarding) {
    settingsWindow.webContents.on('did-finish-load', () => {
      settingsWindow.webContents.send('show-onboarding');
    });
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createOverlayWindow() {
  if (overlayWindow) {
    overlayWindow.show();
    return;
  }

  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;

  overlayWindow = new BrowserWindow({
    width: 300,
    height: 80,
    x: Math.round((screenWidth - 300) / 2),
    y: screenHeight - 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  overlayWindow.loadFile(path.join(__dirname, '..', 'overlay', 'index.html'));
  overlayWindow.setIgnoresMouseEvents(true);

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function hideOverlay() {
  if (overlayWindow) {
    overlayWindow.hide();
  }
}

function updateOverlayState(state, audioLevel = 0) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('state-update', { state, audioLevel });
  }
}

// --- Recording Pipeline ---

async function toggleRecording() {
  if (currentState === State.PROCESSING) {
    return; // Don't interrupt processing
  }

  if (currentState === State.RECORDING) {
    await stopAndProcess();
  } else {
    startRecording();
  }
}

function startRecording() {
  currentState = State.RECORDING;

  // Play start sound
  shell.beep();

  // Show overlay
  createOverlayWindow();
  updateOverlayState('recording');

  // Update tray
  const menuCallbacks = {
    onSettingsClick: () => createSettingsWindow(),
    onQuitClick: () => app.quit(),
    onToggleRecording: () => toggleRecording(),
  };
  setRecordingState(true, menuCallbacks);

  // Start recording
  recorder.startRecording();

  // Update audio level periodically
  const levelInterval = setInterval(() => {
    if (currentState !== State.RECORDING) {
      clearInterval(levelInterval);
      return;
    }
    const level = recorder.getAudioLevel();
    updateOverlayState('recording', level);
  }, 100);

  console.log('[AbhiFlow] Recording started');
}

async function stopAndProcess() {
  currentState = State.PROCESSING;
  updateOverlayState('processing');

  // Play stop sound
  shell.beep();

  // Update tray
  const menuCallbacks = {
    onSettingsClick: () => createSettingsWindow(),
    onQuitClick: () => app.quit(),
    onToggleRecording: () => toggleRecording(),
  };
  setRecordingState(false, menuCallbacks);

  try {
    // Stop recording
    const { wavBuffer, duration } = await recorder.stopRecording();

    if (duration < 0.5) {
      console.log('[AbhiFlow] Recording too short, ignoring');
      hideOverlay();
      currentState = State.IDLE;
      return;
    }

    // Transcribe
    const rawText = await transcribe(wavBuffer);

    if (!rawText || rawText.trim().length === 0) {
      console.log('[AbhiFlow] Empty transcription');
      hideOverlay();
      currentState = State.IDLE;
      return;
    }

    // Check for command mode
    if (isCommand(rawText)) {
      const result = await executeCommand(rawText);
      if (result) {
        await pasteText(result);
        saveHistory(rawText, result, 'command', duration);
      }
      hideOverlay();
      currentState = State.IDLE;
      return;
    }

    // Check for snippet match
    const snippetExpansion = matchSnippet(rawText);
    if (snippetExpansion) {
      await pasteText(snippetExpansion);
      saveHistory(rawText, snippetExpansion, 'snippet', duration);
      hideOverlay();
      currentState = State.IDLE;
      return;
    }

    // Get context for cleanup
    const { app: activeApp, context } = getContext();

    // Clean up text
    const cleanedText = await cleanupText(rawText, context);

    // Paste
    await pasteText(cleanedText);

    // Save to history
    saveHistory(rawText, cleanedText, activeApp, duration);

    updateOverlayState('done');
    setTimeout(() => hideOverlay(), 800);
  } catch (err) {
    console.error('[AbhiFlow] Pipeline error:', err);
    showNotification('AbhiFlow Error', err.message || 'Transcription failed. Check your settings.');
    hideOverlay();
  }

  currentState = State.IDLE;
}

function saveHistory(rawText, cleanedText, appContext, duration) {
  try {
    getDb()
      .prepare(
        'INSERT INTO history (raw_text, cleaned_text, app_context, duration_seconds) VALUES (?, ?, ?, ?)'
      )
      .run(rawText, cleanedText, appContext, duration);
  } catch (err) {
    console.error('[AbhiFlow] Failed to save history:', err);
  }
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}
