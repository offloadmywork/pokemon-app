-- Account recovery codes: human-readable codes mapped to trainer accounts
-- so saves survive lost localStorage / device switches (Epic E4).
CREATE TABLE IF NOT EXISTS account_recovery (
  recovery_code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_account_recovery_user
  ON account_recovery(user_id);
