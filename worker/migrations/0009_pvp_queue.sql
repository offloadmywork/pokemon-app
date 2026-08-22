CREATE TABLE IF NOT EXISTS pvp_queue (
  user_id TEXT PRIMARY KEY,
  team_power INTEGER NOT NULL,
  queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_queue_team_power ON pvp_queue(team_power);
