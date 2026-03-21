import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

export default function History() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    if (!ipcRenderer) return;
    const data = await ipcRenderer.invoke('get-history', 100, search);
    setHistory(data);
  }

  useEffect(() => {
    const timer = setTimeout(() => loadHistory(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function copyText(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function clearAll() {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('clear-history');
    setHistory([]);
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Transcription History</h2>
        {history.length > 0 && (
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search transcriptions..."
        className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-abhiflow-500"
      />

      {/* History list */}
      <div className="space-y-2">
        {history.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-8 text-center text-gray-500 text-sm">
            {search ? 'No results found.' : 'No transcriptions yet. Start dictating!'}
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="bg-white/5 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                  {item.app_context && (
                    <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">
                      {item.app_context}
                    </span>
                  )}
                  {item.duration_seconds && (
                    <span className="text-xs text-gray-500">
                      {item.duration_seconds.toFixed(1)}s
                    </span>
                  )}
                </div>
                <button
                  onClick={() => copyText(item.cleaned_text, item.id)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  {copiedId === item.id ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Cleaned text */}
              <div className="text-sm text-white whitespace-pre-wrap">
                {item.cleaned_text}
              </div>

              {/* Raw text (collapsed) */}
              {item.raw_text !== item.cleaned_text && (
                <details className="group">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                    Show original
                  </summary>
                  <div className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">
                    {item.raw_text}
                  </div>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
