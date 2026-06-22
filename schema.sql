-- Run with: wrangler d1 execute strong-and-lean-db --file=schema.sql

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'ryan',
  date TEXT NOT NULL,
  name TEXT,
  exercises JSON,
  volume INTEGER DEFAULT 0,
  sets INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_logs (
  user_id TEXT NOT NULL DEFAULT 'ryan',
  date TEXT NOT NULL,
  protein INTEGER DEFAULT 0,
  calories INTEGER DEFAULT 0,
  weight REAL,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS prs (
  user_id TEXT NOT NULL DEFAULT 'ryan',
  exercise_id TEXT NOT NULL,
  top_weight REAL,
  reps_at_top INTEGER,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, exercise_id)
);
