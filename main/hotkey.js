const { globalShortcut } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getSetting } = require('./database');

let currentHotkey = null;
let onStartCallback = null;
let onStopCallback = null;
let fnMonitorProcess = null;
let usingFnKey = false;

/**
 * Register hotkey with separate start/stop callbacks for hold-to-dictate.
 * Tries Fn key monitor first (macOS native Swift helper).
 * Falls back to Electron globalShortcut toggle if Fn monitor isn't available.
 */
function register({ onStart, onStop }) {
  onStartCallback = onStart;
  onStopCallback = onStop;

  const hotkeySetting = getSetting('hotkey') || 'fn';

  if (hotkeySetting === 'fn') {
    const started = startFnMonitor();
    if (started) {
      usingFnKey = true;
      console.log('[AbhiFlow] Fn key (hold-to-dictate) registered');
      return true;
    }
    // Fn monitor failed, fall back to globalShortcut toggle
    console.warn('[AbhiFlow] Fn monitor not available, falling back to Cmd+Shift+Space toggle');
    return registerGlobalShortcut('CommandOrControl+Shift+Space');
  }

  return registerGlobalShortcut(hotkeySetting);
}

function registerGlobalShortcut(hotkey) {
  if (currentHotkey) {
    globalShortcut.unregister(currentHotkey);
  }

  // Toggle mode: first press starts, second press stops
  let isRecording = false;

  const success = globalShortcut.register(hotkey, () => {
    if (!isRecording) {
      isRecording = true;
      if (onStartCallback) onStartCallback();
    } else {
      isRecording = false;
      if (onStopCallback) onStopCallback();
    }
  });

  if (success) {
    currentHotkey = hotkey;
    console.log(`[AbhiFlow] Global hotkey registered: ${hotkey} (toggle mode)`);
  } else {
    console.error(`[AbhiFlow] Failed to register hotkey: ${hotkey}`);
  }

  return success;
}

function startFnMonitor() {
  // Look for the compiled Swift binary
  const binaryPath = path.join(__dirname, '..', 'helpers', 'fn-monitor');

  if (!fs.existsSync(binaryPath)) {
    console.warn(`[AbhiFlow] Fn monitor binary not found at ${binaryPath}`);
    console.warn('[AbhiFlow] Run: bash scripts/build-fn-monitor.sh');
    return false;
  }

  try {
    fnMonitorProcess = spawn(binaryPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let isHolding = false;

    fnMonitorProcess.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        const msg = line.trim();
        if (msg === 'down' && !isHolding) {
          isHolding = true;
          if (onStartCallback) onStartCallback();
        } else if (msg === 'up' && isHolding) {
          isHolding = false;
          if (onStopCallback) onStopCallback();
        } else if (msg === 'ready') {
          console.log('[AbhiFlow] Fn key monitor ready');
        }
      }
    });

    fnMonitorProcess.stderr.on('data', (data) => {
      console.error('[AbhiFlow] Fn monitor error:', data.toString());
    });

    fnMonitorProcess.on('exit', (code) => {
      console.log(`[AbhiFlow] Fn monitor exited with code ${code}`);
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

function unregister() {
  stopFnMonitor();
  if (currentHotkey) {
    globalShortcut.unregister(currentHotkey);
    currentHotkey = null;
  }
}

function unregisterAll() {
  stopFnMonitor();
  globalShortcut.unregisterAll();
  currentHotkey = null;
  usingFnKey = false;
}

function reregister() {
  if (onStartCallback && onStopCallback) {
    unregisterAll();
    return register({ onStart: onStartCallback, onStop: onStopCallback });
  }
  return false;
}

function isUsingFnKey() {
  return usingFnKey;
}

module.exports = { register, unregister, unregisterAll, reregister, isUsingFnKey };
