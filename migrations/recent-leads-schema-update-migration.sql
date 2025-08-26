-- Migration: Update recent_leads table structure
-- Purpose: Remove how_soon column, add source column and communications_count
-- Date: 2025-08-25
-- Changes:
--   1. Remove how_soon column from leads table
--   2. Add source column to leads table
--   3. Add communications_count column for performance optimization

-- First, add the new columns before removing the old one for safer migration
-- Add source column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Add communications_count column for caching communication counts
-- This will improve query performance instead of JOINing with communications table every time
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS communications_count INTEGER DEFAULT 0;

-- Add comment to document the new columns
COMMENT ON COLUMN leads.source IS 'Lead source (e.g., Facebook, Google Ads, Website, Referral, etc.)';
COMMENT ON COLUMN leads.communications_count IS 'Cached count of communications for this lead. Updated via triggers or application logic.';

-- Create index for efficient source-based filtering and reporting
CREATE INDEX IF NOT EXISTS idx_leads_source_business 
ON leads (source, business_id, created_at DESC)
WHERE source IS NOT NULL;

-- Create index for communications count filtering (for leads with/without communications)
CREATE INDEX IF NOT EXISTS idx_leads_communications_count_business 
ON leads (communications_count, business_id, created_at DESC);

-- Create composite index for stage + source reporting queries
CREATE INDEX IF NOT EXISTS idx_leads_stage_source_business 
ON leads (stage, source, business_id, created_at DESC)
WHERE source IS NOT NULL;

-- Function to update communications_count for a specific lead
CREATE OR REPLACE FUNCTION update_lead_communications_count(lead_account_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE leads 
  SET communications_count = (
    SELECT COUNT(*) 
    FROM communications 
    WHERE communications.account_id = lead_account_id
  )
  WHERE account_id = lead_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate all communications counts
-- This can be run periodically or after bulk communication updates
CREATE OR REPLACE FUNCTION recalculate_all_communications_counts()
RETURNS void AS $$
BEGIN
  UPDATE leads 
  SET communications_count = (
    SELECT COUNT(*) 
    FROM communications 
    WHERE communications.account_id = leads.account_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update communications_count when communications are added/deleted
CREATE OR REPLACE FUNCTION update_communications_count_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE cases
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_lead_communications_count(NEW.account_id);
    RETURN NEW;
  END IF;
  
  -- Handle DELETE case
  IF TG_OP = 'DELETE' THEN
    PERFORM update_lead_communications_count(OLD.account_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on communications table to automatically maintain the count
DROP TRIGGER IF EXISTS trigger_update_communications_count ON communications;
CREATE TRIGGER trigger_update_communications_count
  AFTER INSERT OR UPDATE OR DELETE ON communications
  FOR EACH ROW EXECUTE FUNCTION update_communications_count_trigger();

-- Initialize communications_count for existing leads
-- This will populate the count for all existing leads based on their current communications
UPDATE leads 
SET communications_count = (
  SELECT COUNT(*) 
  FROM communications 
  WHERE communications.account_id = leads.account_id
)
WHERE communications_count = 0 OR communications_count IS NULL;

-- Set default values for source column based on existing data if needed
-- This is a placeholder - adjust based on business logic requirements
-- UPDATE leads SET source = 'Unknown' WHERE source IS NULL;

-- Now that new columns are populated, we can safely drop the old column
-- Note: Uncomment this line only after confirming all application code has been updated
-- ALTER TABLE leads DROP COLUMN IF EXISTS how_soon;

-- Performance validation queries to test the migration
/*
-- Test query to verify communications count accuracy
SELECT 
  l.lead_id,
  l.account_id,
  l.communications_count,
  (SELECT COUNT(*) FROM communications c WHERE c.account_id = l.account_id) as actual_count
FROM leads l
WHERE l.communications_count != (SELECT COUNT(*) FROM communications c WHERE c.account_id = l.account_id)
LIMIT 10;

-- Test query for source distribution
SELECT 
  source,
  COUNT(*) as lead_count,
  AVG(communications_count) as avg_communications
FROM leads 
WHERE source IS NOT NULL
GROUP BY source
ORDER BY lead_count DESC;
*/