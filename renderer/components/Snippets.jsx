import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

export default function Snippets() {
  const [snippets, setSnippets] = useState([]);
  const [trigger, setTrigger] = useState('');
  const [expansion, setExpansion] = useState('');

  useEffect(() => {
    loadSnippets();
  }, []);

  async function loadSnippets() {
    if (!ipcRenderer) return;
    const data = await ipcRenderer.invoke('get-snippets');
    setSnippets(data);
  }

  async function handleAdd() {
    if (!trigger.trim() || !expansion.trim() || !ipcRenderer) return;
    const data = await ipcRenderer.invoke('add-snippet', trigger.trim(), expansion.trim());
    setSnippets(data);
    setTrigger('');
    setExpansion('');
  }

  async function handleRemove(id) {
    if (!ipcRenderer) return;
    const data = await ipcRenderer.invoke('remove-snippet', id);
    setSnippets(data);
  }

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-xl font-bold text-white">Voice Snippets</h2>

      <p className="text-sm text-gray-400">
        Create voice triggers that expand into saved text. Say the trigger phrase and the expansion text gets pasted instead.
      </p>

      {/* Add snippet */}
      <div className="bg-white/5 rounded-xl p-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Trigger Phrase</label>
          <input
            type="text"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder='e.g., "my email"'
            className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-abhiflow-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Expansion Text</label>
          <textarea
            value={expansion}
            onChange={(e) => setExpansion(e.target.value)}
            placeholder="e.g., abhishek@example.com"
            className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-abhiflow-500 h-20 resize-none"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!trigger.trim() || !expansion.trim()}
          className="px-4 py-2 bg-abhiflow-500 text-white text-sm rounded-lg hover:bg-abhiflow-600 disabled:opacity-50"
        >
          Add Snippet
        </button>
      </div>

      {/* Snippet list */}
      <div className="bg-white/5 rounded-xl overflow-hidden">
        {snippets.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No snippets yet. Add trigger phrases above.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {snippets.map((snippet) => (
              <div key={snippet.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-abhiflow-500 font-medium">
                      "{snippet.trigger_phrase}"
                    </div>
                    <div className="text-sm text-gray-300 mt-1 truncate">
                      {snippet.expansion}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(snippet.id)}
                    className="text-gray-500 hover:text-red-400 text-xs ml-3 flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {snippets.length} snippet{snippets.length !== 1 ? 's' : ''} configured
      </p>
    </div>
  );
}
