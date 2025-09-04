-- CRITICAL FIX: Drop Recursive RLS Policies to Resolve Infinite Recursion
-- Date: 2025-09-04
-- Issue: Authentication failing with PostgreSQL error 42P17 'infinite recursion detected in policy for relation "profiles"'

-- Step 1: Drop the problematic recursive policies
DROP POLICY IF EXISTS super_admin_profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS super_admin_profiles_update_all ON public.profiles;

-- Step 2: Verify remaining safe policies (these should remain)
-- List current policies for verification
SELECT 
    policyname as "Policy Name",
    cmd as "Command",
    qual as "Using Condition",
    with_check as "With Check"
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

-- The remaining safe policies should be:
-- 1. "Users can insert their own profile" (INSERT with auth.uid() = id)
-- 2. "Users can update their own profile" (UPDATE with auth.uid() = id)  
-- 3. "Users can view their own profile" (SELECT with auth.uid() = id)

-- These are safe because they only use auth.uid() = id, not recursive profile queries

COMMIT;