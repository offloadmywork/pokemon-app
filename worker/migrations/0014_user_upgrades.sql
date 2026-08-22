CREATE TABLE IF NOT EXISTS user_upgrades (
  user_id TEXT NOT NULL,
  upgrade_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  PRIMARY KEY (user_id, upgrade_id)
);

CREATE INDEX IF NOT EXISTS idx_user_upgrades_user_id ON user_upgrades(user_id);
