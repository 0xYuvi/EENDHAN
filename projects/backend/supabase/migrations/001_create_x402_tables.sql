-- Create payments table for x402 payment verification
-- Prevents double-spending by tracking used transaction IDs

CREATE TABLE IF NOT EXISTS payments (
    txid TEXT PRIMARY KEY,
    session_id UUID NOT NULL,
    sender TEXT NOT NULL,
    amount BIGINT NOT NULL,
    asset_id BIGINT NOT NULL DEFAULT 10458941,
    status TEXT NOT NULL DEFAULT 'verified',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sessions table for tracking payment sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_sender ON payments(sender);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Create updated_at trigger for sessions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read payments
CREATE POLICY "Allow authenticated read on payments"
    ON payments FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role to insert/update payments (for validator)
CREATE POLICY "Allow service role all on payments"
    ON payments FOR ALL
    TO service_role
    USING (true);

-- Allow authenticated users to read sessions
CREATE POLICY "Allow authenticated read on sessions"
    ON sessions FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role to insert/update sessions
CREATE POLICY "Allow service role all on sessions"
    ON sessions FOR ALL
    TO service_role
    USING (true);
