-- Migration: Add tier column to payment_sessions for dynamic pricing tracking

ALTER TABLE payment_sessions 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic';

CREATE INDEX IF NOT EXISTS idx_payment_sessions_tier 
ON payment_sessions (tier);