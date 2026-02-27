CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY,
  leaderboard_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  detail_json TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(leaderboard_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_key_score ON leaderboard_entries(leaderboard_key, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user_id ON leaderboard_entries(user_id);
