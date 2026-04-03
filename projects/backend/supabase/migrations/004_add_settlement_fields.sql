-- Migration: Add settlement fields to backend_executions table

ALTER TABLE backend_executions 
ADD COLUMN IF NOT EXISTS settle_txn_id TEXT,
ADD COLUMN IF NOT EXISTS settle_error TEXT;