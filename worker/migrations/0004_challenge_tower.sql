-- Challenge tower progress table
CREATE TABLE IF NOT EXISTS challenge_tower_progress (
  user_id TEXT PRIMARY KEY,
  current_floor INTEGER NOT NULL DEFAULT 1,
  best_floor INTEGER NOT NULL DEFAULT 1,
  last_completed_floor INTEGER NOT NULL DEFAULT 0,
  last_completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_tower_user_id ON challenge_tower_progress(user_id);
