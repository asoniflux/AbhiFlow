const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { getSetting } = require('./database');

let onStartCallback = null;
let onStopCallback = null;
let isHolding = false;
let activeName = null;

// --- Fn key via Swift helper ---
let fnMonitorProcess = null;

// --- uiohook-napi for other keys ---
let uIOhookModule = null;
let uiohookStarted = false;
let dictateKeyCode = null;

// Lazy-load uiohook-napi (native module, might fail)
function getUiohook() {
  if (!uIOhookModule) {
    try {
      uIOhookModule = require('uiohook-napi');
    } catch (err) {
      console.error('[AbhiFlow] Failed to load uiohook-napi:', err.message);
      return null;
    }
  }
  return uIOhookModule;
}

// Key map for uiohook
function getKeyMap() {
  const mod = getUiohook();
  if (!mod) return {};
  const K = mod.UiohookKey;
  return {
    'RightOption': K.AltRight,
    'RightCmd': K.MetaRight,
    'RightCtrl': K.CtrlRight,
    'RightShift': K.ShiftRight,
    'F5': K.F5,
    'F6': K.F6,
    'F7': K.F7,
    'F8': K.F8,
    'F9': K.F9,
    'F10': K.F10,
    'F11': K.F11,
    'F12': K.F12,
    'F13': K.F13,
    'F14': K.F14,
    'F15': K.F15,
    'F16': K.F16,
    'F17': K.F17,
    'F18': K.F18,
    'F19': K.F19,
    'F20': K.F20,
  };
}

/**
 * Register hold-to-dictate.
 * - If setting is 'Fn' → use Swift helper for Fn/Globe key
 * - Otherwise → use uiohook-napi for the selected key
 */
function register({ onStart, onStop }) {
  onStartCallback = onStart;
  onStopCallback = onStop;

  let hotkeySetting = getSetting('hotkey') || 'Fn';

  // Migration from old values
  if (hotkeySetting === 'fn' || hotkeySetting === 'CommandOrControl+Shift+Space') {
    hotkeySetting = 'Fn';
  }

  if (hotkeySetting === 'Fn') {
    const started = startFnMonitor();
    if (started) {
      activeName = 'Fn';
      console.log('[AbhiFlow] Hold-to-dictate registered: Fn key (via native helper)');
      return true;
    }
    // Fn monitor failed, fall back to RightOption via uiohook
    console.warn('[AbhiFlow] Fn helper not available, falling back to Right Option key');
    hotkeySetting = 'RightOption';
  }

  return startUiohook(hotkeySetting);
}

// --- Swift helper for Fn key ---

function getFnBinaryPath() {
  // In packaged app: extraResources puts it alongside the app
  if (app.isPackaged) {
    const resourcePath = path.join(process.resourcesPath, 'fn-monitor');
    if (fs.existsSync(resourcePath)) return resourcePath;
  }
  // In dev: helpers/fn-monitor relative to project root
  const devPath = path.join(__dirname, '..', 'helpers', 'fn-monitor');
  if (fs.existsSync(devPath)) return devPath;

  return null;
}

function startFnMonitor() {
  const binaryPath = getFnBinaryPath();
  if (!binaryPath) {
    console.warn('[AbhiFlow] Fn monitor binary not found');
    console.warn('[AbhiFlow] To enable Fn key: run "bash scripts/build-fn-monitor.sh"');
    return false;
  }

  try {
    fnMonitorProcess = spawn(binaryPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    fnMonitorProcess.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        const msg = line.trim();
        if (msg === 'down' && !isHolding) {
          isHolding = true;
          safeCallback(onStartCallback);
        } else if (msg === 'up' && isHolding) {
          isHolding = false;
          safeCallback(onStopCallback);
        } else if (msg === 'ready') {
          console.log('[AbhiFlow] Fn key monitor ready');
        }
      }
    });

    fnMonitorProcess.stderr.on('data', (data) => {
      console.error('[AbhiFlow] Fn monitor stderr:', data.toString().trim());
    });

    fnMonitorProcess.on('exit', (code) => {
      console.log(`[AbhiFlow] Fn monitor exited (code ${code})`);
      fnMonitorProcess = null;
    });

    fnMonitorProcess.on('error', (err) => {
      console.error('[AbhiFlow] Fn monitor spawn error:', err.message);
      fnMonitorProcess = null;
    });

    return true;
  } catch (err) {
    console.error('[AbhiFlow] Failed to start Fn monitor:', err.message);
    return false;
  }
}

function stopFnMonitor() {
  if (fnMonitorProcess) {
    fnMonitorProcess.kill();
    fnMonitorProcess = null;
  }
}

// --- uiohook-napi for other keys ---

function startUiohook(keyName) {
  const mod = getUiohook();
  if (!mod) {
    console.error('[AbhiFlow] uiohook-napi not available — hold-to-dictate disabled');
    return false;
  }

  const keyMap = getKeyMap();
  dictateKeyCode = keyMap[keyName];
  if (!dictateKeyCode) {
    console.warn(`[AbhiFlow] Unknown key "${keyName}", defaulting to RightOption`);
    dictateKeyCode = mod.UiohookKey.AltRight;
    keyName = 'RightOption';
  }

  activeName = keyName;

  mod.uIOhook.on('keydown', (e) => {
    if (e.keycode === dictateKeyCode && !isHolding) {
      isHolding = true;
      safeCallback(onStartCallback);
    }
  });

  mod.uIOhook.on('keyup', (e) => {
    if (e.keycode === dictateKeyCode && isHolding) {
      isHolding = false;
      safeCallback(onStopCallback);
    }
  });

  try {
    mod.uIOhook.start();
    uiohookStarted = true;
    console.log(`[AbhiFlow] Hold-to-dictate registered: ${keyName} (hold to record, release to stop)`);
    return true;
  } catch (err) {
    console.error('[AbhiFlow] Failed to start uiohook:', err.message);
    return false;
  }
}

function stopUiohook() {
  if (uiohookStarted) {
    try {
      const mod = getUiohook();
      if (mod) mod.uIOhook.stop();
    } catch (err) {
      console.warn('[AbhiFlow] uiohook stop error:', err.message);
    }
    uiohookStarted = false;
  }
}

// --- Shared ---

function safeCallback(cb) {
  if (cb) {
    try {
      cb();
    } catch (err) {
      console.error('[AbhiFlow] Callback error:', err.message);
    }
  }
}

function unregister() {
  stopFnMonitor();
  stopUiohook();
  isHolding = false;
}

function unregisterAll() {
  unregister();
}

function reregister() {
  if (onStartCallback && onStopCallback) {
    unregisterAll();
    return register({ onStart: onStartCallback, onStop: onStopCallback });
  }
  return false;
}

function getKeyName() {
  return activeName || getSetting('hotkey') || 'Fn';
}

module.exports = { register, unregister, unregisterAll, reregister, getKeyName };
