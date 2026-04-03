-- Script to create missing tables for AlgoGate / EENDHAN

CREATE TABLE IF NOT EXISTS endpoints (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    price_usd NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id TEXT REFERENCES endpoints(id),
    consumer_wallet TEXT NOT NULL,
    target_wallet TEXT NOT NULL,
    amount_algo NUMERIC NOT NULL,
    nonce TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES payment_sessions(id),
    consumer_wallet TEXT NOT NULL,
    endpoint_id TEXT REFERENCES endpoints(id),
    request_payload JSONB,
    response_status INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
