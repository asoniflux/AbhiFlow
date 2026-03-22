import React, { useState } from 'react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

const STEPS = ['welcome', 'apikey', 'permissions', 'test', 'done'];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const currentStep = STEPS[step];

  async function validateAndSaveKey() {
    if (!apiKey.trim() || !ipcRenderer) return;
    setApiKeyStatus('checking');
    const result = await ipcRenderer.invoke('check-api-key', apiKey.trim());
    if (result.valid) {
      await ipcRenderer.invoke('set-setting', 'groq_api_key', apiKey.trim());
      setApiKeyStatus('valid');
      setTimeout(() => setStep(step + 1), 800);
    } else {
      setApiKeyStatus('invalid');
    }
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] p-8">
      <div className="max-w-md w-full">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? 'bg-abhiflow-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Step: Welcome */}
        {currentStep === 'welcome' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-abhiflow-500 rounded-2xl flex items-center justify-center text-3xl font-bold text-white mx-auto">
              A
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome to AbhiFlow</h1>
            <p className="text-gray-400">
              System-wide voice dictation for macOS. Hold the Right Option key from any app, speak, and clean text gets pasted at your cursor.
            </p>
            <button
              onClick={next}
              className="w-full py-3 bg-abhiflow-500 text-white rounded-xl font-medium hover:bg-abhiflow-600"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step: API Key */}
        {currentStep === 'apikey' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Enter your Groq API Key</h2>
            <p className="text-sm text-gray-400">
              AbhiFlow uses Groq's Whisper API for speech-to-text. Get your free API key at{' '}
              <a href="#" className="text-abhiflow-500 underline" onClick={() => {
                if (window.require) {
                  window.require('electron').shell.openExternal('https://console.groq.com/keys');
                }
              }}>
                console.groq.com
              </a>
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setApiKeyStatus(null);
              }}
              placeholder="gsk_..."
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-abhiflow-500"
            />
            {apiKeyStatus === 'valid' && (
              <p className="text-green-400 text-sm">API key verified!</p>
            )}
            {apiKeyStatus === 'invalid' && (
              <p className="text-red-400 text-sm">Invalid API key. Please check and try again.</p>
            )}
            <button
              onClick={validateAndSaveKey}
              disabled={!apiKey.trim() || apiKeyStatus === 'checking'}
              className="w-full py-3 bg-abhiflow-500 text-white rounded-xl font-medium hover:bg-abhiflow-600 disabled:opacity-50"
            >
              {apiKeyStatus === 'checking' ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
        )}

        {/* Step: Permissions */}
        {currentStep === 'permissions' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Grant Permissions</h2>
            <p className="text-sm text-gray-400">
              AbhiFlow needs two macOS permissions to work:
            </p>
            <div className="space-y-3">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-white text-sm font-medium">Microphone Access</div>
                <div className="text-gray-400 text-xs mt-1">
                  Required to capture your voice. macOS will prompt you automatically.
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-white text-sm font-medium">Accessibility Access</div>
                <div className="text-gray-400 text-xs mt-1">
                  Required to paste text into other apps. Go to System Settings &gt; Privacy &amp; Security &gt; Accessibility and add AbhiFlow.
                </div>
              </div>
            </div>
            <button
              onClick={next}
              className="w-full py-3 bg-abhiflow-500 text-white rounded-xl font-medium hover:bg-abhiflow-600"
            >
              I've Granted Permissions
            </button>
            <button
              onClick={next}
              className="w-full py-2 text-gray-400 text-sm hover:text-white"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step: Test */}
        {currentStep === 'test' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Test AbhiFlow</h2>
            <p className="text-sm text-gray-400">
              Hold the <kbd className="bg-white/10 px-2 py-0.5 rounded text-white text-xs">Right Option ⌥</kbd> key to record, speak something, then release to stop and paste.
            </p>
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="text-gray-400 text-sm">
                {testResult || 'Try dictating something...'}
              </div>
            </div>
            <button
              onClick={next}
              className="w-full py-3 bg-abhiflow-500 text-white rounded-xl font-medium hover:bg-abhiflow-600"
            >
              {testResult ? 'Finish Setup' : 'Skip Test'}
            </button>
          </div>
        )}

        {/* Step: Done */}
        {currentStep === 'done' && (
          <div className="text-center space-y-4">
            <div className="text-4xl">&#10003;</div>
            <h2 className="text-xl font-bold text-white">You're All Set!</h2>
            <p className="text-gray-400 text-sm">
              AbhiFlow is running in your menu bar. Hold the <kbd className="bg-white/10 px-2 py-0.5 rounded text-white text-xs">Right Option ⌥</kbd> key from any app to dictate.
            </p>
            <button
              onClick={onComplete}
              className="w-full py-3 bg-abhiflow-500 text-white rounded-xl font-medium hover:bg-abhiflow-600"
            >
              Open Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
