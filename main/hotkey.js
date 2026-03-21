const { globalShortcut } = require('electron');
const { getSetting } = require('./database');

let currentHotkey = null;
let toggleCallback = null;

function register(callback) {
  toggleCallback = callback;
  const hotkey = getSetting('hotkey') || 'CommandOrControl+Shift+Space';

  if (currentHotkey) {
    globalShortcut.unregister(currentHotkey);
  }

  const success = globalShortcut.register(hotkey, () => {
    if (toggleCallback) {
      toggleCallback();
    }
  });

  if (success) {
    currentHotkey = hotkey;
    console.log(`[AbhiFlow] Global hotkey registered: ${hotkey}`);
  } else {
    console.error(`[AbhiFlow] Failed to register hotkey: ${hotkey}`);
  }

  return success;
}

function unregister() {
  if (currentHotkey) {
    globalShortcut.unregister(currentHotkey);
    currentHotkey = null;
  }
}

function unregisterAll() {
  globalShortcut.unregisterAll();
  currentHotkey = null;
}

function reregister() {
  if (toggleCallback) {
    return register(toggleCallback);
  }
  return false;
}

module.exports = { register, unregister, unregisterAll, reregister };
