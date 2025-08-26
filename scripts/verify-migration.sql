-- Verification Script for time_speed Column Migration
-- Purpose: Verify that the time_speed column was added successfully to leads_calls table
-- Run this after applying the migration to ensure everything works correctly

-- 1. Check if the column exists in the table schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'leads_calls' 
  AND column_name = 'time_speed';

-- Expected result: Should return one row showing the time_speed column

-- 2. Check if the indexes were created successfully
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'leads_calls' 
  AND (indexname LIKE '%time_speed%' OR indexname LIKE '%performance_metrics%');

-- Expected result: Should show the two indexes created by the migration

-- 3. Verify the column comment was added
SELECT 
    col_description(c.oid, a.attnum) as column_comment
FROM pg_class c
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE c.relname = 'leads_calls' 
  AND a.attname = 'time_speed'
  AND NOT a.attisdropped;

-- Expected result: Should show the comment about response speed tracking

-- 4. Test a basic query to ensure the column is accessible
SELECT 
    COUNT(*) as total_records,
    COUNT(time_speed) as records_with_time_speed,
    AVG(time_speed) as avg_time_speed,
    MIN(time_speed) as min_time_speed,
    MAX(time_speed) as max_time_speed
FROM leads_calls;

-- Expected result: Should run without errors and show statistics

-- 5. Test the exact query pattern used by the appointment-setters API endpoint
SELECT 
    assigned,
    COUNT(DISTINCT lead_id) as total_leads,
    AVG(time_speed) as avg_response_speed,
    COUNT(time_speed) as calls_with_time_speed
FROM leads_calls 
WHERE assigned IS NOT NULL 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY assigned
HAVING COUNT(DISTINCT lead_id) > 0
ORDER BY avg_response_speed ASC NULLS LAST;

-- Expected result: Should run without errors, may return empty results if no recent data

-- 6. Verify table structure completeness
\d leads_calls;

-- Expected result: Should show all columns including time_speed

-- Success message
SELECT 'Migration verification completed successfully!' as status;