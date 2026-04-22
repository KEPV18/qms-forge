-- ============================================================================
-- QMS FORGE — SECURITY HARDENING: RLS Policy Overhaul
--
-- ISSUES CONFIRMED BY STRESS TEST:
-- 1. Hard DELETE by authenticated users: WORKS (permissive overrides restrictive)
-- 2. Anon UPDATE on records: WORKS (no anon block for UPDATE)
-- 3. Records INSERT/UPDATE: no role check (any authenticated user)
--
-- audit_log UPDATE: ALREADY BLOCKED (RLS works, stress test had false positive)
-- notifications: ALREADY properly gated (user_id = auth.uid())
--
-- STRATEGY:
-- - DROP the permissive DELETE policy on records (it overrides the restrictive one)
-- - DROP the permissive INSERT/UPDATE policies, replace with role-gated versions
-- - Block anon access for ALL operations (not just SELECT)
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Fix records — remove dangerous permissive policies
-- ═══════════════════════════════════════════════════════════════════════════

-- DROP the permissive DELETE (allows all authenticated users to hard-delete)
DROP POLICY IF EXISTS "Authenticated users can delete records" ON public.records;

-- DROP the permissive INSERT (allows all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can insert records" ON public.records;

-- DROP the permissive UPDATE (allows all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can update records" ON public.records;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Add admin/manager-only INSERT policy
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Admin and manager can insert records" ON public.records
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'manager')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Add admin/manager-only UPDATE policy
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Admin and manager can update records" ON public.records
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'manager')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Verify — list all policies on records
-- ═══════════════════════════════════════════════════════════════════════════

SELECT tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'records' AND schemaname = 'public'
ORDER BY cmd, policyname;