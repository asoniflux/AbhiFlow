const { getDb } = require('./database');

function getAllSnippets() {
  return getDb()
    .prepare('SELECT id, trigger_phrase, expansion, created_at FROM snippets ORDER BY trigger_phrase ASC')
    .all();
}

function addSnippet(triggerPhrase, expansion) {
  const trigger = triggerPhrase.trim().toLowerCase();
  const exp = expansion.trim();
  if (!trigger) throw new Error('Trigger phrase cannot be empty');
  if (!exp) throw new Error('Expansion cannot be empty');

  return getDb()
    .prepare('INSERT OR REPLACE INTO snippets (trigger_phrase, expansion) VALUES (?, ?)')
    .run(trigger, exp);
}

function removeSnippet(id) {
  return getDb().prepare('DELETE FROM snippets WHERE id = ?').run(id);
}

function matchSnippet(text) {
  const normalized = text.trim().toLowerCase();
  const snippet = getDb()
    .prepare('SELECT expansion FROM snippets WHERE LOWER(trigger_phrase) = ?')
    .get(normalized);
  return snippet ? snippet.expansion : null;
}

module.exports = { getAllSnippets, addSnippet, removeSnippet, matchSnippet };
