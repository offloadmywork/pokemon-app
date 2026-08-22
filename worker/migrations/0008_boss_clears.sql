CREATE TABLE IF NOT EXISTS boss_clears (
  user_id TEXT NOT NULL,
  boss_key TEXT NOT NULL,
  name TEXT NOT NULL,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  cleared_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  PRIMARY KEY (user_id, boss_key)
);

CREATE INDEX IF NOT EXISTS idx_boss_clears_user_id ON boss_clears(user_id);
