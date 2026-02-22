-- Team table for cross-device team persistence
CREATE TABLE IF NOT EXISTS team (
  id TEXT PRIMARY KEY,
  pokemon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  power_level INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'Common',
  image_url TEXT,
  maxHP INTEGER DEFAULT 100,
  currentHP INTEGER DEFAULT 100,
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for position-based ordering
CREATE INDEX IF NOT EXISTS idx_team_position ON team(position);
