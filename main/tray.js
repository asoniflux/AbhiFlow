const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;

function createTray({ onSettingsClick, onQuitClick, onToggleRecording }) {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');

  // Create a small default icon if asset doesn't exist
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = createDefaultIcon();
    }
  } catch {
    icon = createDefaultIcon();
  }

  icon = icon.resize({ width: 18, height: 18 });
  tray = new Tray(icon);
  tray.setToolTip('AbhiFlow — Voice Dictation');

  updateMenu({ onSettingsClick, onQuitClick, onToggleRecording, isRecording: false });

  return tray;
}

function createDefaultIcon() {
  // Create a simple 18x18 icon programmatically
  const size = 18;
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    const cx = size / 2;
    const cy = size / 2;
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const offset = i * 4;
    if (dist < size / 2 - 1) {
      canvas[offset] = 79;     // R
      canvas[offset + 1] = 110; // G
      canvas[offset + 2] = 247; // B
      canvas[offset + 3] = 255; // A
    } else {
      canvas[offset + 3] = 0; // transparent
    }
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function updateMenu({ onSettingsClick, onQuitClick, onToggleRecording, isRecording }) {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isRecording ? '⏹ Stop Recording' : '🎙 Start Recording',
      click: onToggleRecording,
    },
    { type: 'separator' },
    {
      label: 'Settings...',
      click: onSettingsClick,
    },
    { type: 'separator' },
    {
      label: 'Quit AbhiFlow',
      click: onQuitClick,
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function setRecordingState(isRecording, menuCallbacks) {
  if (!tray) return;

  const iconName = isRecording ? 'tray-icon-recording.png' : 'tray-icon.png';
  const iconPath = path.join(__dirname, '..', 'assets', iconName);

  try {
    let icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = createDefaultIcon();
    }
    icon = icon.resize({ width: 18, height: 18 });
    tray.setImage(icon);
  } catch {
    // Keep current icon if new one fails
  }

  tray.setToolTip(isRecording ? 'AbhiFlow — Recording...' : 'AbhiFlow — Voice Dictation');
  updateMenu({ ...menuCallbacks, isRecording });
}

function getTray() {
  return tray;
}

module.exports = { createTray, setRecordingState, getTray };
