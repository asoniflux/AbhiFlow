import React, { useState, useEffect } from 'react';
import Settings from './components/Settings';
import Dictionary from './components/Dictionary';
import Snippets from './components/Snippets';
import History from './components/History';
import Onboarding from './components/Onboarding';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'dictionary', label: 'Dictionary' },
  { id: 'snippets', label: 'Snippets' },
  { id: 'history', label: 'History' },
  { id: 'about', label: 'About' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('general');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.on('show-onboarding', () => setShowOnboarding(true));

      // Check if API key is set
      ipcRenderer.invoke('get-setting', 'groq_api_key').then((key) => {
        if (!key) setShowOnboarding(true);
      });
    }
    return () => {
      if (ipcRenderer) ipcRenderer.removeAllListeners('show-onboarding');
    };
  }, []);

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-48 bg-[#16162a] border-r border-white/10 p-4 flex flex-col gap-1">
        <div className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-abhiflow-500 rounded-md flex items-center justify-center text-xs font-bold">A</span>
          AbhiFlow
        </div>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-abhiflow-500/20 text-abhiflow-500 font-medium'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'general' && <Settings />}
        {activeTab === 'dictionary' && <Dictionary />}
        {activeTab === 'snippets' && <Snippets />}
        {activeTab === 'history' && <History />}
        {activeTab === 'about' && <About />}
      </div>
    </div>
  );
}

function About() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-app-version').then(setVersion);
    }
  }, []);

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-bold text-white mb-4">About AbhiFlow</h2>
      <div className="bg-white/5 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-abhiflow-500 rounded-xl flex items-center justify-center text-xl font-bold text-white">
            A
          </div>
          <div>
            <div className="text-white font-semibold">AbhiFlow</div>
            <div className="text-gray-400 text-sm">Version {version || '1.0.0'}</div>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          System-wide voice dictation for macOS. Press your hotkey from any app, speak, and clean text gets pasted at your cursor.
        </p>
        <p className="text-gray-500 text-xs">
          Built by Abhishek Soni. Powered by Groq Whisper + Llama.
        </p>
      </div>
    </div>
  );
}
