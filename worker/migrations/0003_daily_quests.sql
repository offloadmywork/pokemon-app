-- Daily quests
CREATE TABLE IF NOT EXISTS daily_quests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  quest_date TEXT NOT NULL,
  template_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  reward_item_id TEXT,
  reward_item_quantity INTEGER NOT NULL DEFAULT 0,
  completed_at DATETIME,
  claimed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, quest_date, template_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date);
