-- Add users table for cross-device sync
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add user_id columns to existing tables
-- Note: We'll make these nullable initially for backward compatibility
ALTER TABLE caught_pokemon ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE team ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE player_progress ADD COLUMN user_id TEXT REFERENCES users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_caught_pokemon_user_id ON caught_pokemon(user_id);
CREATE INDEX IF NOT EXISTS idx_team_user_id ON team(user_id);
CREATE INDEX IF NOT EXISTS idx_player_progress_user_id ON player_progress(user_id);
