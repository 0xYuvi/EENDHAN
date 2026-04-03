-- Migration: Add pricing_tiers JSONB column to endpoints table
-- Enables dynamic multi-tier pricing for AI endpoints

ALTER TABLE endpoints 
ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '{"basic": 10000}';

-- Index for faster tier-based lookups
CREATE INDEX IF NOT EXISTS idx_endpoints_pricing_tiers 
ON endpoints USING GIN (pricing_tiers);

-- Update existing endpoints with default tier if not present
UPDATE endpoints 
SET pricing_tiers = jsonb_set(
    COALESCE(pricing_tiers, '{}'::jsonb),
    '{basic}',
    to_jsonb(price_usdc * 1000000::numeric),
    true
)
WHERE pricing_tiers IS NULL OR pricing_tiers = '{}'::jsonb;