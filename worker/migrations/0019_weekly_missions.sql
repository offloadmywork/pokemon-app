-- Weekly missions for Phase 4 Live Ops & Retention
CREATE TABLE IF NOT EXISTS weekly_missions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  mission_key TEXT NOT NULL,
  event TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  claimed_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, week_key, mission_key),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_missions_user_week
  ON weekly_missions(user_id, week_key);
