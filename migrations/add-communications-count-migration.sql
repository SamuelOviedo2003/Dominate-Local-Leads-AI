-- Migration: Add communications_count column to leads table
-- Purpose: Add cached communications count field for performance optimization
-- Date: 2025-08-27
-- Changes:
--   1. Add communications_count column to leads table
--   2. Create trigger to automatically maintain the count
--   3. Create index for efficient filtering
--   4. Initialize count for existing leads

-- Add communications_count column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS communications_count INTEGER DEFAULT 0;

-- Add comment to document the column purpose
COMMENT ON COLUMN leads.communications_count IS 'Cached count of communications for this lead. Updated via triggers or application logic.';

-- Create index for communications count filtering (for leads with/without communications)
CREATE INDEX IF NOT EXISTS idx_leads_communications_count_business 
ON leads (communications_count, business_id, created_at DESC);

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

-- Verification queries for testing the migration
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

-- Test summary of communications count distribution
SELECT 
  communications_count,
  COUNT(*) as lead_count
FROM leads 
GROUP BY communications_count 
ORDER BY communications_count;
*/