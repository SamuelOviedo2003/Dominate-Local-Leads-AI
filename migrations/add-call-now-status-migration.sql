-- Migration: Add call_now_status column to leads table
-- Purpose: Add priority status field for Recent Leads table gradient backgrounds
-- Date: 2025-08-27
-- Changes:
--   1. Add call_now_status column to leads table
--   2. Create index for efficient priority-based filtering
--   3. Add comments and constraints for data integrity

-- Add call_now_status column to leads table
-- Values: 1=High Priority, 2=Medium Priority, 3=Normal Priority, NULL=Normal Priority
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS call_now_status SMALLINT;

-- Add constraint to ensure only valid priority values
ALTER TABLE leads 
ADD CONSTRAINT IF NOT EXISTS check_call_now_status_valid 
CHECK (call_now_status IN (1, 2, 3) OR call_now_status IS NULL);

-- Add comment to document the column purpose and values
COMMENT ON COLUMN leads.call_now_status IS 'Call priority status: 1=High Priority (Red gradient), 2=Medium Priority (Orange gradient), 3=Normal Priority (Default), NULL=Normal Priority (Default)';

-- Create index for efficient priority-based filtering and ordering
CREATE INDEX IF NOT EXISTS idx_leads_call_now_status_business 
ON leads (call_now_status, business_id, created_at DESC)
WHERE call_now_status IS NOT NULL;

-- Create composite index for stage + priority filtering (Recent Leads queries)
CREATE INDEX IF NOT EXISTS idx_leads_stage_priority_business 
ON leads (stage, call_now_status, business_id, created_at DESC)
WHERE stage IN (1, 2);

-- Initialize with default values for testing
-- Set some sample data for demonstration (optional - can be removed in production)
-- High priority: leads with score >= 80
UPDATE leads 
SET call_now_status = 1 
WHERE score >= 80 AND call_now_status IS NULL;

-- Medium priority: leads with score between 50-79
UPDATE leads 
SET call_now_status = 2 
WHERE score >= 50 AND score < 80 AND call_now_status IS NULL;

-- Normal priority: leads with score < 50 (can be NULL or 3)
-- Leave as NULL for normal priority (no update needed)

-- Verification queries for testing the migration
/*
-- Test query to verify call_now_status distribution
SELECT 
  call_now_status,
  COUNT(*) as count,
  AVG(score) as avg_score,
  MIN(score) as min_score,
  MAX(score) as max_score
FROM leads 
GROUP BY call_now_status 
ORDER BY call_now_status NULLS LAST;

-- Test query for Recent Leads with priority styling
SELECT 
  lead_id,
  first_name,
  last_name,
  score,
  call_now_status,
  stage,
  created_at
FROM leads 
WHERE stage IN (1, 2)
ORDER BY call_now_status NULLS LAST, created_at DESC
LIMIT 20;

-- Verify indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'leads' 
AND indexname LIKE '%call_now_status%';
*/