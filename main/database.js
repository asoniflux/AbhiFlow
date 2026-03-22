const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'abhiflow.db');
}

function initialize() {
  const dbPath = getDbPath();
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Run migrations
  const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '001-init.sql');
  const migration = fs.readFileSync(migrationPath, 'utf-8');
  db.exec(migration);

  // Migrate old hotkey values to new format
  const hotkey = getSetting('hotkey');
  if (hotkey === 'fn' || hotkey === 'CommandOrControl+Shift+Space') {
    setSetting('hotkey', 'Fn');
  }

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initialize() first.');
  }
  return db;
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

// Settings helpers
function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

function getAllSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

module.exports = { initialize, getDb, close, getSetting, setSetting, getAllSettings };
