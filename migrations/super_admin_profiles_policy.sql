-- Super Admin Profiles Access Policy Migration
-- This migration adds the necessary RLS policy to allow super admins to view all profiles
-- Date: 2025-09-04

-- Allow super admins to see all profiles
CREATE POLICY super_admin_profiles_select_all
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 0
  )
);

-- Optional: Allow super admins to update other users' profiles (for user management)
CREATE POLICY super_admin_profiles_update_all
ON public.profiles
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 0
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 0
  )
);

-- Optional: Allow super admins to delete users (if needed for user management)
-- CREATE POLICY super_admin_profiles_delete_all
-- ON public.profiles
-- FOR DELETE
-- TO public
-- USING (
--   EXISTS (
--     SELECT 1
--     FROM public.profiles p
--     WHERE p.id = auth.uid()
--       AND p.role = 0
--   )
-- );