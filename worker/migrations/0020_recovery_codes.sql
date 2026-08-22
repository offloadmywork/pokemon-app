-- Recovery phrases mapped to saves (Epic E4: Save Safety)
CREATE TABLE IF NOT EXISTS recovery_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id
  ON recovery_codes(user_id);
