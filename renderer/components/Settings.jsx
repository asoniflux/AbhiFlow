import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState(null); // null | 'checking' | 'valid' | 'invalid'
  const [hotkey, setHotkey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    if (!ipcRenderer) return;
    const s = await ipcRenderer.invoke('get-settings');
    setSettings(s);
    setApiKey(s.groq_api_key || '');
    setHotkey(s.hotkey || 'CommandOrControl+Shift+Space');
  }

  async function saveSetting(key, value) {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('set-setting', key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function validateApiKey() {
    if (!apiKey.trim()) return;
    setApiKeyStatus('checking');
    const result = await ipcRenderer.invoke('check-api-key', apiKey.trim());
    setApiKeyStatus(result.valid ? 'valid' : 'invalid');
    if (result.valid) {
      saveSetting('groq_api_key', apiKey.trim());
    }
  }

  async function toggleSetting(key) {
    const newValue = settings[key] === 'true' ? 'false' : 'true';
    setSettings({ ...settings, [key]: newValue });
    saveSetting(key, newValue);
  }

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-xl font-bold text-white">General Settings</h2>

      {saved && (
        <div className="bg-green-500/20 text-green-400 text-sm px-4 py-2 rounded-lg">
          Settings saved!
        </div>
      )}

      {/* API Key */}
      <div className="bg-white/5 rounded-xl p-5 space-y-3">
        <label className="block text-sm font-medium text-gray-300">Groq API Key</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setApiKeyStatus(null);
            }}
            placeholder="gsk_..."
            className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-abhiflow-500"
          />
          <button
            onClick={validateApiKey}
            disabled={apiKeyStatus === 'checking'}
            className="px-4 py-2 bg-abhiflow-500 text-white text-sm rounded-lg hover:bg-abhiflow-600 disabled:opacity-50"
          >
            {apiKeyStatus === 'checking' ? 'Checking...' : 'Save'}
          </button>
        </div>
        {apiKeyStatus === 'valid' && (
          <p className="text-green-400 text-xs">API key is valid!</p>
        )}
        {apiKeyStatus === 'invalid' && (
          <p className="text-red-400 text-xs">Invalid API key. Please check and try again.</p>
        )}
        <p className="text-gray-500 text-xs">
          Get your free API key at{' '}
          <a href="#" className="text-abhiflow-500 underline" onClick={() => {
            if (window.require) {
              window.require('electron').shell.openExternal('https://console.groq.com/keys');
            }
          }}>
            console.groq.com
          </a>
        </p>
      </div>

      {/* Hotkey */}
      <div className="bg-white/5 rounded-xl p-5 space-y-3">
        <label className="block text-sm font-medium text-gray-300">Global Hotkey</label>
        <input
          type="text"
          value={hotkey}
          onChange={(e) => setHotkey(e.target.value)}
          onBlur={() => saveSetting('hotkey', hotkey)}
          className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-abhiflow-500"
        />
        <p className="text-gray-500 text-xs">
          Default: CommandOrControl+Shift+Space. Uses Electron accelerator format.
        </p>
      </div>

      {/* Toggles */}
      <div className="bg-white/5 rounded-xl p-5 space-y-4">
        <ToggleRow
          label="Sound Feedback"
          description="Play a beep when recording starts and stops"
          enabled={settings.sound_enabled === 'true'}
          onToggle={() => toggleSetting('sound_enabled')}
        />
        <ToggleRow
          label="Launch at Login"
          description="Start AbhiFlow automatically when you log in"
          enabled={settings.auto_launch === 'true'}
          onToggle={() => toggleSetting('auto_launch')}
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, description, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-white">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-abhiflow-500' : 'bg-white/20'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}
