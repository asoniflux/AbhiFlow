const { ipcMain } = require('electron');
const { getAllSettings, getSetting, setSetting } = require('./database');
const { getAllWords, addWord, removeWord, importWords, exportWords } = require('./dictionary');
const { getAllSnippets, addSnippet, removeSnippet } = require('./snippets');
const { getDb } = require('./database');
const { reregister } = require('./hotkey');
const { resetClient: resetTranscriberClient } = require('./transcriber');
const { resetClient: resetCleanerClient } = require('./cleaner');

function registerHandlers() {
  // Settings
  ipcMain.handle('get-settings', () => getAllSettings());
  ipcMain.handle('get-setting', (_, key) => getSetting(key));
  ipcMain.handle('set-setting', (_, key, value) => {
    setSetting(key, value);
    // Re-register hotkey if it changed
    if (key === 'hotkey') {
      reregister();
    }
    // Reset API clients if key changed
    if (key === 'groq_api_key') {
      resetTranscriberClient();
      resetCleanerClient();
    }
    return true;
  });

  // Dictionary
  ipcMain.handle('get-dictionary', () => getAllWords());
  ipcMain.handle('add-word', (_, word) => {
    addWord(word);
    return getAllWords();
  });
  ipcMain.handle('remove-word', (_, id) => {
    removeWord(id);
    return getAllWords();
  });
  ipcMain.handle('import-words', (_, csv) => {
    const count = importWords(csv);
    return { count, words: getAllWords() };
  });
  ipcMain.handle('export-words', () => exportWords());

  // Snippets
  ipcMain.handle('get-snippets', () => getAllSnippets());
  ipcMain.handle('add-snippet', (_, triggerPhrase, expansion) => {
    addSnippet(triggerPhrase, expansion);
    return getAllSnippets();
  });
  ipcMain.handle('remove-snippet', (_, id) => {
    removeSnippet(id);
    return getAllSnippets();
  });

  // History
  ipcMain.handle('get-history', (_, limit = 100, search = '') => {
    const db = getDb();
    if (search) {
      return db
        .prepare(
          `SELECT * FROM history WHERE raw_text LIKE ? OR cleaned_text LIKE ? ORDER BY created_at DESC LIMIT ?`
        )
        .all(`%${search}%`, `%${search}%`, limit);
    }
    return db.prepare('SELECT * FROM history ORDER BY created_at DESC LIMIT ?').all(limit);
  });

  ipcMain.handle('clear-history', () => {
    getDb().prepare('DELETE FROM history').run();
    return true;
  });

  // App info
  ipcMain.handle('get-app-version', () => {
    const { app } = require('electron');
    return app.getVersion();
  });

  ipcMain.handle('check-api-key', async (_, apiKey) => {
    try {
      const Groq = require('groq-sdk');
      const client = new Groq({ apiKey });
      await client.models.list();
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  });
}

module.exports = { registerHandlers };
