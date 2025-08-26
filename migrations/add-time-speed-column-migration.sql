-- Migration: Add time_speed column to leads_calls table
-- Purpose: Fix missing column error for appointment setter response speed tracking
-- Date: 2025-08-25
-- Issue: column leads_calls.time_speed does not exist

-- Add the missing time_speed column to leads_calls table
-- This column tracks response speed for appointment setter performance metrics
ALTER TABLE leads_calls 
ADD COLUMN IF NOT EXISTS time_speed INTEGER;

-- Add a comment to document the column purpose
COMMENT ON COLUMN leads_calls.time_speed IS 'Response speed in seconds for appointment setter performance tracking. Used for calculating average response times filtered by working_hours = true.';

-- Create index for performance optimization on time_speed queries
-- This will improve query performance when calculating average response speeds
CREATE INDEX IF NOT EXISTS idx_leads_calls_time_speed 
ON leads_calls (time_speed) 
WHERE time_speed IS NOT NULL AND time_speed > 0;

-- Create composite index for the common query pattern (working_hours + time_speed filtering)
-- This optimizes the appointment setter performance queries
CREATE INDEX IF NOT EXISTS idx_leads_calls_performance_metrics 
ON leads_calls (assigned, time_speed) 
WHERE time_speed IS NOT NULL AND time_speed > 0;

-- Optional: Update existing records with default values if needed
-- Note: This is commented out as we may want to keep existing records as NULL
-- and only populate time_speed for future records or through separate data population
/*
UPDATE leads_calls 
SET time_speed = 0 
WHERE time_speed IS NULL 
  AND created_at < NOW() 
  AND assigned IS NOT NULL;
*/

-- Performance validation query to test the migration
-- This query mimics the appointment setter API endpoint query pattern
/*
SELECT 
  assigned,
  AVG(time_speed) as avg_response_speed,
  COUNT(*) as total_calls,
  COUNT(time_speed) as calls_with_speed
FROM leads_calls 
WHERE assigned IS NOT NULL 
  AND time_speed IS NOT NULL 
  AND time_speed > 0
GROUP BY assigned
ORDER BY avg_response_speed ASC;
*/