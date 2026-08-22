-- Owned player cosmetics
CREATE TABLE IF NOT EXISTS user_cosmetics (
  user_id TEXT NOT NULL,
  cosmetic_id TEXT NOT NULL,
  equipped INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  PRIMARY KEY (user_id, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cosmetics_user_id ON user_cosmetics(user_id);
