-- Migration: Add recording_url and call_summary fields to incoming_calls table
-- This enables the Recent Calls popup to display audio recordings and call summaries
-- Created: 2025-08-28

-- Add recording_url and call_summary columns to incoming_calls table
ALTER TABLE incoming_calls 
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS call_summary TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN incoming_calls.recording_url IS 'URL to audio recording of the call';
COMMENT ON COLUMN incoming_calls.call_summary IS 'Summary of the call content and notes';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'incoming_calls' 
AND column_name IN ('recording_url', 'call_summary')
ORDER BY column_name;