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
  caught_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nickname TEXT,
  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pokemon_type ON pokemon(type);
CREATE INDEX IF NOT EXISTS idx_pokemon_rarity ON pokemon(rarity);
CREATE INDEX IF NOT EXISTS idx_caught_pokemon_date ON caught_pokemon(caught_date);
