-- ============================================================================
-- Fix: Add authenticated read policy to profiles table
-- Without this policy, authenticated users cannot read even their own profile,
-- causing syncUserProfile to fall back to role="user" and hide admin features.
-- ============================================================================

-- Add SELECT policy for authenticated users on profiles
CREATE POLICY "profiles_authenticated_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Also add a policy for users to read their own profile (more restrictive)
-- Actually, for simplicity and since all authenticated users need profile info
-- for the user list, USING (true) is appropriate.