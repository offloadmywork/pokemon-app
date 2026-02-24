-- Player progress table for cross-device XP and level persistence
CREATE TABLE IF NOT EXISTS player_progress (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Single row table
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default progress if not exists
INSERT OR IGNORE INTO player_progress (id, xp, level) VALUES (1, 0, 1);
