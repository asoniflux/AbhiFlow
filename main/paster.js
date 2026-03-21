const { clipboard } = require('electron');

let robotjs = null;
try {
  robotjs = require('@jitsi/robotjs');
} catch {
  console.warn('[AbhiFlow] robotjs not available, paste simulation disabled');
}

async function pasteText(text) {
  if (!text || text.trim().length === 0) {
    console.log('[AbhiFlow] Nothing to paste');
    return;
  }

  // Save current clipboard content
  const originalClipboard = clipboard.readText();

  // Write cleaned text to clipboard
  clipboard.writeText(text);

  // Small delay to ensure clipboard is updated
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Simulate Cmd+V (macOS) using robotjs
  if (robotjs) {
    robotjs.keyTap('v', 'command');
  } else {
    console.warn('[AbhiFlow] Cannot simulate paste — robotjs not loaded');
  }

  console.log('[AbhiFlow] Text pasted');

  // Restore original clipboard after 2 seconds
  setTimeout(() => {
    clipboard.writeText(originalClipboard);
    console.log('[AbhiFlow] Clipboard restored');
  }, 2000);
}

module.exports = { pasteText };
