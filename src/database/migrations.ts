export const MIGRATIONS = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS snippets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    code        TEXT NOT NULL,
    language    TEXT NOT NULL,
    tags        TEXT,
    is_favorite INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS attached_files (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    snippet_id  INTEGER,
    file_uri    TEXT NOT NULL,
    file_name   TEXT,
    file_type   TEXT,
    FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
  );`
];
