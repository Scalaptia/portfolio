-- Faces visitors draw for the PC. Nothing reaches anyone else's screen until it is approved, so
-- every row starts out pending.
CREATE TABLE faces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  art TEXT NOT NULL,
  scheme TEXT NOT NULL,
  author TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);
CREATE INDEX faces_by_status ON faces (status, created_at DESC);
CREATE INDEX faces_by_ip ON faces (ip_hash, created_at);
