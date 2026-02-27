-- Evolution rules
CREATE TABLE IF NOT EXISTS pokemon_evolutions (
  id TEXT PRIMARY KEY,
  from_name TEXT NOT NULL,
  to_name TEXT NOT NULL,
  min_trainer_level INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_name)
);

CREATE INDEX IF NOT EXISTS idx_pokemon_evolutions_from_name ON pokemon_evolutions(from_name);
CREATE INDEX IF NOT EXISTS idx_pokemon_evolutions_to_name ON pokemon_evolutions(to_name);

INSERT INTO pokemon_evolutions (id, from_name, to_name, min_trainer_level)
VALUES
  ('evo-flametail-jr', 'Flametail Jr', 'Blazetail', 3),
  ('evo-ripplefin', 'Ripplefin', 'Tidalwave', 3),
  ('evo-leaflet', 'Leaflet', 'Vinewhip', 3)
ON CONFLICT(from_name) DO UPDATE SET
  to_name = excluded.to_name,
  min_trainer_level = excluded.min_trainer_level;
