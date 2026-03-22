const { uIOhook, UiohookKey } = require('uiohook-napi');
const { getSetting } = require('./database');

let onStartCallback = null;
let onStopCallback = null;
let isHolding = false;
let started = false;
let dictateKeyCode = null;

// Map of friendly names to uiohook key codes
const KEY_MAP = {
  'RightOption': UiohookKey.AltRight,
  'RightCmd': UiohookKey.MetaRight,
  'RightCtrl': UiohookKey.CtrlRight,
  'RightShift': UiohookKey.ShiftRight,
  'F5': UiohookKey.F5,
  'F6': UiohookKey.F6,
  'F7': UiohookKey.F7,
  'F8': UiohookKey.F8,
  'F9': UiohookKey.F9,
  'F10': UiohookKey.F10,
  'F11': UiohookKey.F11,
  'F12': UiohookKey.F12,
  'F13': UiohookKey.F13,
  'F14': UiohookKey.F14,
  'F15': UiohookKey.F15,
  'F16': UiohookKey.F16,
  'F17': UiohookKey.F17,
  'F18': UiohookKey.F18,
  'F19': UiohookKey.F19,
  'F20': UiohookKey.F20,
  'CapsLock': UiohookKey.CapsLock,
};

// Reverse map for display
const CODE_TO_NAME = {};
for (const [name, code] of Object.entries(KEY_MAP)) {
  CODE_TO_NAME[code] = name;
}

/**
 * Register hold-to-dictate with uiohook-napi.
 * User holds a key → onStart fires. User releases → onStop fires.
 */
function register({ onStart, onStop }) {
  onStartCallback = onStart;
  onStopCallback = onStop;

  let hotkeySetting = getSetting('hotkey') || 'RightOption';

  // Migration: old 'fn' setting → RightOption
  if (hotkeySetting === 'fn' || hotkeySetting === 'CommandOrControl+Shift+Space') {
    hotkeySetting = 'RightOption';
  }

  // Resolve the key code
  dictateKeyCode = KEY_MAP[hotkeySetting];
  if (!dictateKeyCode) {
    console.warn(`[AbhiFlow] Unknown hotkey "${hotkeySetting}", defaulting to RightOption`);
    dictateKeyCode = UiohookKey.AltRight;
  }

  const keyName = CODE_TO_NAME[dictateKeyCode] || hotkeySetting;

  // Set up uiohook event listeners
  uIOhook.on('keydown', (e) => {
    if (e.keycode === dictateKeyCode && !isHolding) {
      isHolding = true;
      if (onStartCallback) {
        try {
          onStartCallback();
        } catch (err) {
          console.error('[AbhiFlow] onStart error:', err.message);
        }
      }
    }
  });

  uIOhook.on('keyup', (e) => {
    if (e.keycode === dictateKeyCode && isHolding) {
      isHolding = false;
      if (onStopCallback) {
        try {
          onStopCallback();
        } catch (err) {
          console.error('[AbhiFlow] onStop error:', err.message);
        }
      }
    }
  });

  // Start the hook
  try {
    uIOhook.start();
    started = true;
    console.log(`[AbhiFlow] Hold-to-dictate registered: ${keyName} (hold to record, release to stop)`);
    return true;
  } catch (err) {
    console.error('[AbhiFlow] Failed to start uiohook:', err.message);
    return false;
  }
}

function unregister() {
  if (started) {
    try {
      uIOhook.stop();
    } catch (err) {
      console.warn('[AbhiFlow] uiohook stop error:', err.message);
    }
    started = false;
    isHolding = false;
  }
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
  if (dictateKeyCode) {
    return CODE_TO_NAME[dictateKeyCode] || 'Unknown';
  }
  return getSetting('hotkey') || 'RightOption';
}

module.exports = { register, unregister, unregisterAll, reregister, getKeyName, KEY_MAP };
