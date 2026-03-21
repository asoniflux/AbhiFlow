import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

export default function Dictionary() {
  const [words, setWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadWords();
  }, []);

  async function loadWords() {
    if (!ipcRenderer) return;
    const data = await ipcRenderer.invoke('get-dictionary');
    setWords(data);
  }

  async function handleAdd() {
    if (!newWord.trim() || !ipcRenderer) return;
    const data = await ipcRenderer.invoke('add-word', newWord.trim());
    setWords(data);
    setNewWord('');
  }

  async function handleRemove(id) {
    if (!ipcRenderer) return;
    const data = await ipcRenderer.invoke('remove-word', id);
    setWords(data);
  }

  async function handleImport() {
    if (!importText.trim() || !ipcRenderer) return;
    const { words: data } = await ipcRenderer.invoke('import-words', importText);
    setWords(data);
    setImportText('');
    setShowImport(false);
  }

  async function handleExport() {
    if (!ipcRenderer) return;
    const csv = await ipcRenderer.invoke('export-words');
    navigator.clipboard.writeText(csv);
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Custom Dictionary</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-3 py-1.5 text-xs bg-white/10 text-gray-300 rounded-lg hover:bg-white/20"
          >
            Import
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs bg-white/10 text-gray-300 rounded-lg hover:bg-white/20"
          >
            Export
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        Add names, technical terms, and custom words to improve transcription accuracy.
        These words are sent as context hints to the Whisper API.
      </p>

      {/* Import area */}
      {showImport && (
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste comma-separated words: React, Next.js, Abhishek, Anthropic"
            className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-abhiflow-500 h-20 resize-none"
          />
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-abhiflow-500 text-white text-sm rounded-lg hover:bg-abhiflow-600"
          >
            Import Words
          </button>
        </div>
      )}

      {/* Add word */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add a word..."
          className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-abhiflow-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newWord.trim()}
          className="px-4 py-2 bg-abhiflow-500 text-white text-sm rounded-lg hover:bg-abhiflow-600 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Word list */}
      <div className="bg-white/5 rounded-xl overflow-hidden">
        {words.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No custom words yet. Add words above to improve transcription accuracy.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {words.map((word) => (
              <div key={word.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-white">{word.word}</span>
                <button
                  onClick={() => handleRemove(word.id)}
                  className="text-gray-500 hover:text-red-400 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {words.length} word{words.length !== 1 ? 's' : ''} in dictionary
      </p>
    </div>
  );
}
