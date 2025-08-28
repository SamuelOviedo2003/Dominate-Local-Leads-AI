-- Migration: Add caller_type field to leads table
-- Purpose: Add caller_type field to track lead caller classification
-- Date: 2025-08-28
-- Changes:
--   1. Add caller_type column to leads table with predefined values
--   2. Create index for efficient filtering by caller_type
--   3. Add validation constraint for allowed caller_type values

-- Add caller_type column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS caller_type VARCHAR(50);

-- Add comment to document the new column
COMMENT ON COLUMN leads.caller_type IS 'Type of caller for this lead (Client, Sales person, Other, Looking for job)';

-- Create index for efficient caller_type-based filtering and reporting
CREATE INDEX IF NOT EXISTS idx_leads_caller_type_business 
ON leads (caller_type, business_id, created_at DESC)
WHERE caller_type IS NOT NULL;

-- Create composite index for stage + caller_type reporting queries
CREATE INDEX IF NOT EXISTS idx_leads_stage_caller_type_business 
ON leads (stage, caller_type, business_id, created_at DESC)
WHERE caller_type IS NOT NULL;

-- Add constraint to ensure only valid caller_type values are accepted
ALTER TABLE leads 
ADD CONSTRAINT IF NOT EXISTS chk_caller_type_valid 
CHECK (caller_type IS NULL OR caller_type IN ('Client', 'Sales person', 'Other', 'Looking for job'));

-- Performance validation queries to test the migration
/*
-- Test query for caller_type distribution
SELECT 
  caller_type,
  COUNT(*) as lead_count,
  AVG(score) as avg_score,
  COUNT(CASE WHEN contacted = true THEN 1 END) as contacted_count
FROM leads 
WHERE caller_type IS NOT NULL
GROUP BY caller_type
ORDER BY lead_count DESC;

-- Test query for caller_type by business
SELECT 
  business_id,
  caller_type,
  COUNT(*) as lead_count
FROM leads 
WHERE caller_type IS NOT NULL
GROUP BY business_id, caller_type
ORDER BY business_id, lead_count DESC;
*/