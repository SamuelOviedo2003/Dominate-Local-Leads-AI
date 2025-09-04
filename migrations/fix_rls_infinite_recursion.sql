-- Fix RLS Infinite Recursion on Profiles Table
-- Date: 2025-09-04
-- Issue: Policies that query profiles table from within profiles policies cause infinite recursion
-- Solution: Drop recursive policies, handle super admin access at application level

-- Drop the problematic recursive policies that cause infinite recursion
DROP POLICY IF EXISTS super_admin_profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS super_admin_profiles_update_all ON public.profiles;

-- Keep the safe, non-recursive policies for regular users
-- These policies only use auth.uid() = id which doesn't cause recursion:
-- "Users can insert their own profile" (INSERT)
-- "Users can update their own profile" (UPDATE) 
-- "Users can view their own profile" (SELECT)

-- Note: Super admin access to all profiles will be handled at the application level
-- using service role client or bypassing RLS for specific admin operations