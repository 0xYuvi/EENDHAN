-- Migration: Add mandates and approval_tokens tables

CREATE TABLE IF NOT EXISTS mandates (
    id UUID PRIMARY KEY,
    agent_id TEXT NOT NULL,
    max_txn_amount BIGINT NOT NULL,
    max_velocity_amount BIGINT NOT NULL,
    max_daily_amount BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS approval_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    agent_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mandates_agent_id ON mandates(agent_id);
CREATE INDEX IF NOT EXISTS idx_mandates_status ON mandates(status);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_token ON approval_tokens(token);