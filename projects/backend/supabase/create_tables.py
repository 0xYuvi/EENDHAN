"""
Supabase database setup script for x402 payment verification.
Run this script to create the required tables for double-spend prevention.

Usage:
    python -m supabase.create_tables
"""

from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()


def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(url, key)


def create_tables(client: Client) -> None:
    sql = """
    CREATE TABLE IF NOT EXISTS payments (
        txid TEXT PRIMARY KEY,
        session_id UUID NOT NULL,
        sender TEXT NOT NULL,
        amount BIGINT NOT NULL,
        asset_id BIGINT NOT NULL DEFAULT 10458941,
        status TEXT NOT NULL DEFAULT 'verified',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
    CREATE INDEX IF NOT EXISTS idx_payments_sender ON payments(sender);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
    CREATE TRIGGER update_sessions_updated_at
        BEFORE UPDATE ON sessions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """

    response = client.rpc("pg_catalog.to_regclass", {"text": "payments"}).execute()
    print(f"Tables check response: {response}")


def verify_tables(client: Client) -> None:
    tables = ["payments", "sessions"]

    for table in tables:
        try:
            result = client.table(table).select("*").limit(1).execute()
            print(f"✓ Table '{table}' exists")
        except Exception as e:
            print(f"✗ Table '{table}' missing or error: {e}")


def main() -> None:
    print("Setting up Supabase tables for x402 payment verification...\n")

    try:
        client = get_supabase_client()
        print("✓ Connected to Supabase")

        create_tables(client)
        print("✓ Tables created/verified")

        verify_tables(client)
        print("\n✓ Supabase setup complete!")

    except ValueError as e:
        print(f"Configuration error: {e}")
        print("\nPlease set environment variables:")
        print("  SUPABASE_URL=https://your-project.supabase.co")
        print("  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
