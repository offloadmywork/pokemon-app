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
