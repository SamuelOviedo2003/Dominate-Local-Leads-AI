-- Verification script for stage filtering updates
-- Run this after applying the stage 3 migration

-- 1. Verify stage constraint allows values 1, 2, 3
SELECT 
  constraint_name, 
  check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'leads' 
  AND constraint_name = 'check_leads_stage_valid';

-- 2. Check current stage distribution
SELECT 
  stage,
  COUNT(*) as lead_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM leads 
GROUP BY stage 
ORDER BY stage;

-- 3. Verify indexes exist for efficient stage filtering
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'leads' 
  AND indexname LIKE '%stage%'
ORDER BY indexname;

-- 4. Test query performance for New Leads (stages 1, 2)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) 
FROM leads 
WHERE stage IN (1, 2) 
  AND business_id = 1 
  AND created_at >= NOW() - INTERVAL '30 days';

-- 5. Test query performance for Bookings (stage 3)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) 
FROM leads 
WHERE stage = 3 
  AND business_id = 1 
  AND created_at >= NOW() - INTERVAL '30 days';

-- 6. Verify no data integrity issues
SELECT 
  'leads_without_stage' as check_name,
  COUNT(*) as count
FROM leads 
WHERE stage IS NULL

UNION ALL

SELECT 
  'leads_with_invalid_stage' as check_name,
  COUNT(*) as count
FROM leads 
WHERE stage NOT IN (1, 2, 3);