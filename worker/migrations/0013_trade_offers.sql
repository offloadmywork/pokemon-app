-- Trading offer persistence
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
