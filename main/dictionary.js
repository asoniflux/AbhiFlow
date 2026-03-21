const { getDb } = require('./database');

function getAllWords() {
  return getDb().prepare('SELECT id, word, created_at FROM dictionary ORDER BY word ASC').all();
}

function addWord(word) {
  const trimmed = word.trim();
  if (!trimmed) throw new Error('Word cannot be empty');

  return getDb()
    .prepare('INSERT OR IGNORE INTO dictionary (word) VALUES (?)')
    .run(trimmed);
}

function removeWord(id) {
  return getDb().prepare('DELETE FROM dictionary WHERE id = ?').run(id);
}

function importWords(csvString) {
  const words = csvString
    .split(',')
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  const stmt = getDb().prepare('INSERT OR IGNORE INTO dictionary (word) VALUES (?)');
  const insertMany = getDb().transaction((words) => {
    for (const word of words) {
      stmt.run(word);
    }
  });

  insertMany(words);
  return words.length;
}

function exportWords() {
  const words = getAllWords();
  return words.map((w) => w.word).join(', ');
}

module.exports = { getAllWords, addWord, removeWord, importWords, exportWords };
