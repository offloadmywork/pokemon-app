CREATE TABLE IF NOT EXISTS coop_raid_rooms (
  id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL,
  boss_id TEXT NOT NULL,
  boss_name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  max_hp INTEGER NOT NULL,
  current_hp INTEGER NOT NULL,
  power INTEGER NOT NULL,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS coop_raid_participants (
  raid_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  team_power INTEGER NOT NULL DEFAULT 0,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (raid_id) REFERENCES coop_raid_rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  PRIMARY KEY (raid_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coop_raid_rooms_status ON coop_raid_rooms(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coop_raid_participants_user ON coop_raid_participants(user_id, joined_at DESC);
