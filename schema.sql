-- Users table (for cross-device sync)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pokemon table
CREATE TABLE IF NOT EXISTS pokemon (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Dragon', 'Fairy', 'Rock', 'Ice', 'Flying')),
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK(rarity IN ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary')) DEFAULT 'Common',
  power_level INTEGER NOT NULL CHECK(power_level BETWEEN 1 AND 100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Caught Pokemon table
CREATE TABLE IF NOT EXISTS caught_pokemon (
  id TEXT PRIMARY KEY,
  pokemon_id TEXT NOT NULL,
  user_id TEXT,
  caught_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nickname TEXT,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Evolution rules (by Pokemon name)
CREATE TABLE IF NOT EXISTS pokemon_evolutions (
  id TEXT PRIMARY KEY,
  from_name TEXT NOT NULL,
  to_name TEXT NOT NULL,
  min_trainer_level INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_name)
);

-- Player progress table
CREATE TABLE IF NOT EXISTS player_progress (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Team table
CREATE TABLE IF NOT EXISTS team (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  pokemon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  power_level INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'Common',
  image_url TEXT NOT NULL,
  maxHP INTEGER NOT NULL DEFAULT 100,
  currentHP INTEGER NOT NULL DEFAULT 100,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pokemon_type ON pokemon(type);
CREATE INDEX IF NOT EXISTS idx_pokemon_rarity ON pokemon(rarity);
CREATE INDEX IF NOT EXISTS idx_caught_pokemon_date ON caught_pokemon(caught_date);
CREATE INDEX IF NOT EXISTS idx_pokemon_evolutions_from_name ON pokemon_evolutions(from_name);
CREATE INDEX IF NOT EXISTS idx_pokemon_evolutions_to_name ON pokemon_evolutions(to_name);

-- User items table
CREATE TABLE IF NOT EXISTS user_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_caught_pokemon_user_id ON caught_pokemon(user_id);
CREATE INDEX IF NOT EXISTS idx_player_progress_user_id ON player_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_team_user_id ON team(user_id);

-- Player wallet / soft currency
CREATE TABLE IF NOT EXISTS player_wallet (
  user_id TEXT PRIMARY KEY,
  coins INTEGER NOT NULL DEFAULT 0,
  shards INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Permanent trainer upgrades
CREATE TABLE IF NOT EXISTS user_upgrades (
  user_id TEXT NOT NULL,
  upgrade_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  PRIMARY KEY (user_id, upgrade_id)
);

CREATE INDEX IF NOT EXISTS idx_user_upgrades_user_id ON user_upgrades(user_id);

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

-- Claimed player achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

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

-- Daily quest claim streaks
CREATE TABLE IF NOT EXISTS daily_quest_streaks (
  user_id TEXT PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_claim_date TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);


-- Challenge tower progress
CREATE TABLE IF NOT EXISTS challenge_tower_progress (
  user_id TEXT PRIMARY KEY,
  current_floor INTEGER NOT NULL DEFAULT 1,
  best_floor INTEGER NOT NULL DEFAULT 1,
  last_completed_floor INTEGER NOT NULL DEFAULT 0,
  last_completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_tower_user_id ON challenge_tower_progress(user_id);

-- Zone boss clear progression
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

-- Leaderboards
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY,
  leaderboard_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  detail_json TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(leaderboard_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_key_score ON leaderboard_entries(leaderboard_key, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user_id ON leaderboard_entries(user_id);

-- PvP matchmaking queue
CREATE TABLE IF NOT EXISTS pvp_queue (
  user_id TEXT PRIMARY KEY,
  team_power INTEGER NOT NULL,
  queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_queue_team_power ON pvp_queue(team_power);

-- PvP match results
CREATE TABLE IF NOT EXISTS pvp_matches (
  id TEXT PRIMARY KEY,
  player_user_id TEXT NOT NULL,
  opponent_user_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  winner_user_id TEXT,
  player_remaining_pokemon INTEGER NOT NULL DEFAULT 0,
  opponent_remaining_pokemon INTEGER NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_user_id) REFERENCES users(id),
  FOREIGN KEY (opponent_user_id) REFERENCES users(id),
  FOREIGN KEY (winner_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_matches_player ON pvp_matches(player_user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_opponent ON pvp_matches(opponent_user_id, completed_at DESC);

-- Co-op raid rooms
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

-- Trading
CREATE TABLE IF NOT EXISTS trade_offers (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  offered_caught_id TEXT NOT NULL,
  requested_caught_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'complete', 'cancelled', 'declined')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id),
  FOREIGN KEY (offered_caught_id) REFERENCES caught_pokemon(id),
  FOREIGN KEY (requested_caught_id) REFERENCES caught_pokemon(id)
);

CREATE INDEX IF NOT EXISTS idx_trade_offers_from_user ON trade_offers(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_offers_to_user ON trade_offers(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_offers_status ON trade_offers(status);
CREATE INDEX IF NOT EXISTS idx_trade_offers_pending_from_user ON trade_offers(status, from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_offers_pending_to_user ON trade_offers(status, to_user_id, created_at DESC);

-- Player session analytics for KPI snapshots
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started ON user_sessions(user_id, started_at DESC);
