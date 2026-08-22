-- Migration: Create recovery_codes table for E4 Save Safety
CREATE TABLE IF NOT EXISTS recovery_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recovery_user ON recovery_codes(user_id);
