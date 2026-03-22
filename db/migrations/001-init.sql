CREATE TABLE IF NOT EXISTS dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger_phrase TEXT NOT NULL UNIQUE,
    expansion TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_text TEXT,
    cleaned_text TEXT,
    app_context TEXT,
    duration_seconds REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
    ('hotkey', 'Fn'),
    ('language', 'en'),
    ('sound_enabled', 'true'),
    ('auto_launch', 'false'),
    ('groq_api_key', '');
