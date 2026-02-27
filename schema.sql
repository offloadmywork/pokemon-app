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
