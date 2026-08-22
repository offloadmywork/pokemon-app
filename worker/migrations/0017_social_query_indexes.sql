-- Composite indexes for high-traffic pending trade lists.
CREATE INDEX IF NOT EXISTS idx_trade_offers_pending_from_user
  ON trade_offers(status, from_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_offers_pending_to_user
  ON trade_offers(status, to_user_id, created_at DESC);
