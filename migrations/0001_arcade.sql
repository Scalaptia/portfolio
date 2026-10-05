-- harogatOS arcade. A run is handed out when a game starts and spent when its score is saved, so
-- the Worker can time the game with its own clock and refuse to take the same run twice.
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  game TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX runs_by_ip ON runs (ip_hash, started_at);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  initials TEXT NOT NULL,
  score INTEGER NOT NULL,
  rows INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX scores_board ON scores (game, score DESC, created_at ASC);
CREATE INDEX scores_by_ip ON scores (ip_hash, created_at);
