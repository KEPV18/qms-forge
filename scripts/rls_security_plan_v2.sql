# RLS Security Migration Plan v2 — Zero-Downtime

**Date:** 2026-04-21
**Status:** DRAFT — Awaiting Batman's approval. Do NOT execute yet.
**Strategy:** Restrictive policies first → verify → remove old permissive policies. No time window without protection.

---

# How Zero-Downtime RLS Works

PostgreSQL evaluates RLS policies as:
```
(permissive1 OR permissive2 OR ...) AND (restrictive1 AND restrictive2 AND ...)
```

**Permissive** policies are OR'd — any one matching grants access.
**Restrictive** policies are AND'd — ALL must match or access is denied.

Current state: Only PERMISSIVE policies exist, including ones for `anon`.
Adding a RESTRICTIVE policy that requires `auth.role() = 'authenticated'` will:
- ✅ Still allow authenticated users (permissive matches + restrictive matches)
- 🔴 Block anon users (permissive matches BUT restrictive fails → denied)

**No policies are dropped. No window of zero protection. Old policies stay until explicitly removed after verification.**

---

# Execution Phases

## Phase A: ADD Restrictive Policies + CREATE New Permissive — NO DROPS

### Step A0: Baseline Validation (Read-only)

```sql
-- A0: Record current state. NO CHANGES. Diagnostic only.
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, permissive DESC, cmd;
```

**External verification (run from shell with anon key):**
```bash
# Must return ALLOWED before we start (proves baseline)
node -e "const {createClient}=require('@supabase/supabase-js');const sb=createClient('https://iouuikteroixnsqazznc.supabase.co','sb_publishable_-9nZ5bjWkfV8_AFSSA3Qdg_LAMr8NxJ');sb.from('records').select('code').limit(1).then(r=>console.log('ANON SELECT:',r.data?'ALLOWED':'BLOCKED'))"
```

### Step A1: Add RESTRICTIVE "require authenticated" to all tables

This is the kill-switch. One policy per table. Instantly blocks anon without touching existing policies.

```sql
-- ═══════════════════════════════════════════════════════════
-- A1: ADD RESTRICTIVE POLICY TO EVERY TABLE
-- These are AND'd with existing permissive policies.
-- Anon permissive policies still exist BUT restrictive fails for anon → DENIED.
-- Authenticated users pass both permissive AND restrictive → ALLOWED.
-- ═══════════════════════════════════════════════════════════

-- P0: Tables with real data and active frontend
CREATE POLICY "rls_require_authenticated" ON records
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

CREATE POLICY "rls_require_authenticated" ON audit_log
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

CREATE POLICY "rls_require_authenticated" ON profiles
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

CREATE POLICY "rls_require_authenticated" ON user_roles
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

-- P1: Tables with frontend usage, no data yet
CREATE POLICY "rls_require_authenticated" ON capas
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

CREATE POLICY "rls_require_authenticated" ON risks
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

CREATE POLICY "rls_require_authenticated" ON process_interactions
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

CREATE POLICY "rls_require_authenticated" ON processes
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

-- P2: Tables unused by frontend, still need protection
CREATE POLICY "rls_require_authenticated" ON document_metadata
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

CREATE POLICY "rls_require_authenticated" ON document_reviews
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

CREATE POLICY "rls_require_authenticated" ON document_versions
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

-- notifications: Use user-level restriction instead of just "authenticated"
CREATE POLICY "rls_require_authenticated" ON notifications
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

-- error_reports: Already partially restricted, add blanket
CREATE POLICY "rls_require_authenticated" ON error_reports
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
```

### Step A1-Verify: Test anon access is now blocked

```bash
# After A1, this MUST return BLOCKED
node -e "const {createClient}=require('@supabase/supabase-js');const sb=createClient('https://iouuikteroixnsqazznc.supabase.co','sb_publishable_-9nZ5bjWkfV8_AFSSA3Qdg_LAMr8NxJ');sb.from('records').select('code').limit(1).then(r=>console.log('ANON SELECT after A1:',r.data?'ALLOWED — CRITICAL BUG':'BLOCKED ✅',r.error?'Error:'+r.error.message:''))"

# Also test INSERT
node -e "const {createClient}=require('@supabase/supabase-js');const sb=createClient('https://iouuikteroixnsqazznc.supabase.co','sb_publishable_-9nZ5bjWkfV8_AFSSA3Qdg_LAMr8NxJ');sb.from('records').insert({code:'F/99',record_name:'SECURITY_TEST',category:'Test',row_index:9999}).then(r=>console.log('ANON INSERT after A1:',r.data?'ALLOWED — CRITICAL BUG':'BLOCKED ✅',r.error?'Error:'+r.error.message:''))"

# Also test profiles (most sensitive — contains passwords in plain text)
node -e "const {createClient}=require('@supabase/supabase-js');const sb=createClient('https://iouuikteroixnsqazznc.supabase.co','sb_publishable_-9nZ5bjWkfV8_AFSSA3Qdg_LAMr8NxJ');sb.from('profiles').select('email').limit(1).then(r=>console.log('ANON PROFILES after A1:',r.data?'ALLOWED — CRITICAL BUG':'BLOCKED ✅',r.error?'Error:'+r.error.message:''))"
```

### Step A2: Add role-aware RESTRICTIVE policies for write operations

Current state after A1: All authenticated users can do everything (old permissive policies still grant it).
Now add a second restrictive layer: writes require admin/manager role.

```sql
-- ═══════════════════════════════════════════════════════════
-- A2: ADD ROLE-AWARE RESTRICTIVE POLICIES FOR WRITES
-- These further restrict INSERT/UPDATE/DELETE to admin+manager only.
-- Combined with A1's "require authenticated" restrictive,
-- the effective policy is now:
--   SELECT:  authenticated ✅
--   INSERT/UPDATE/DELETE:  authenticated AND (admin OR manager) ✅
-- ═══════════════════════════════════════════════════════════

-- records: writes require admin or manager
CREATE POLICY "rls_write_requires_admin_or_manager" ON records
  AS RESTRICTIVE FOR INSERT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "rls_write_requires_admin_or_manager" ON records
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- records: delete requires admin only
CREATE POLICY "rls_delete_requires_admin" ON records
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- profiles: writes require admin or manager
CREATE POLICY "rls_write_requires_admin_or_manager" ON profiles
  AS RESTRICTIVE FOR INSERT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "rls_write_requires_admin_or_manager" ON profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "rls_delete_requires_admin" ON profiles
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- user_roles: all writes require admin
CREATE POLICY "rls_write_requires_admin" ON user_roles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- capas, risks, process_interactions: writes require admin or manager
CREATE POLICY "rls_write_requires_admin_or_manager" ON capas
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "rls_write_requires_admin_or_manager" ON risks
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "rls_write_requires_admin_or_manager" ON process_interactions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "rls_write_requires_admin_or_manager" ON processes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- notifications: users can only access their own
CREATE POLICY "rls_notifications_owner_only" ON notifications
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- audit_log: read-only for all authenticated (no UPDATE/DELETE restrictive needed —
-- existing permissive policies only grant SELECT and INSERT, so UPDATE/DELETE is already denied)
-- But add an explicit restrictive to prevent future permissive policies from allowing writes:
CREATE POLICY "rls_audit_readonly_excluding_insert" ON audit_log
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false);
CREATE POLICY "rls_audit_readonly_excluding_delete" ON audit_log
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);
```

### Step A2-Verify: Full role-based access test

```bash
# Test 1: Anon still blocked (from A1)
# (same commands as A1-verify — must still return BLOCKED)

# Test 2: Authenticated manager can SELECT records
# (requires login — test from running app on port 8081)

# Test 3: Authenticated manager can INSERT records
# (test from app UI — create a test record)

# Test 4: Audit log is read-only (UPDATE fails)
# (query via app — attempt to modify an audit_log entry, should fail silently)
```

**SQL-based verification (service_role, check policy structure):**
```sql
-- Verify policies are layered correctly
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'rls_%'
ORDER BY tablename, cmd;
```

---

## Phase B: REMOVE Old Insecure Permissive Policies

Only execute after Phase A is verified and working for at least 5 minutes with live app testing.

### Step B1: Drop anon/public permissive policies

```sql
-- ═══════════════════════════════════════════════════════════
-- B1: DROP OLD INSECURE PERMISSIVE POLICIES
-- These are now redundant — restrictive policies enforce the real rules.
-- Removing them cleans up policy evaluation but changes NO effective access
-- because restrictive policies already enforce the same restrictions.
-- ═══════════════════════════════════════════════════════════

-- records: Remove 4 anon policies (authenticated policies stay as permissive baseline)
DROP POLICY IF EXISTS "Anon can read records" ON records;
DROP POLICY IF EXISTS "Anon can insert records" ON records;
DROP POLICY IF EXISTS "Anon can update records" ON records;
DROP POLICY IF EXISTS "Anon can delete records" ON records;

-- audit_log: Remove 2 anon policies
DROP POLICY IF EXISTS "Anon can read audit_log" ON audit_log;
DROP POLICY IF EXISTS "Anon can insert audit_log" ON audit_log;

-- profiles: Remove 1 public ALL policy
DROP POLICY IF EXISTS "Allow all" ON profiles;

-- user_roles: Remove 1 public ALL policy
DROP POLICY IF EXISTS "Allow all" ON user_roles;

-- capas: Remove 1 public ALL policy
DROP POLICY IF EXISTS "Allow all" ON capas;

-- risks: Remove 1 public ALL policy
DROP POLICY IF EXISTS "Allow all" ON risks;

-- process_interactions: Remove 1 public ALL policy
DROP POLICY IF EXISTS "Allow all" ON process_interactions;

-- processes: Remove 1 public ALL policy
DROP POLICY IF EXISTS "Allow all" ON processes;

-- notifications: Remove 1 public ALL policy
DROP POLICY IF EXISTS "Allow all" ON notifications;

-- document_metadata: Remove 2 old policies
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_metadata;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_metadata;

-- document_reviews: Remove 2 old policies
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_reviews;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_reviews;

-- document_versions: Remove 2 old policies
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_versions;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_versions;

-- error_reports: Remove 3 old policies
DROP POLICY IF EXISTS "Allow insert for all" ON error_reports;
DROP POLICY IF EXISTS "Allow select for admins" ON error_reports;
DROP POLICY IF EXISTS "Allow update for admins" ON error_reports;
```

### Step B1-Verify: Confirm same effective access as A2

```bash
# Anon still blocked
node -e "const {createClient}=require('@supabase/supabase-js');const sb=createClient('https://iouuikteroixnsqazznc.supabase.co','sb_publishable_-9nZ5bjWkfV8_AFSSA3Qdg_LAMr8NxJ');sb.from('records').select('code').limit(1).then(r=>console.log('ANON SELECT after B1:',r.data?'ALLOWED — ROLLBACK NOW':'BLOCKED ✅'))"

# Authenticated still works (test from app UI)
```

### Step B2: Clean up remaining redundant authenticated permissive policies

The old authenticated permissive policies are now technically redundant — the restrictive policies do the real enforcement, and the remaining authenticated permissive policies just form the "allow" side. They can stay for clarity, OR we can replace them with cleaner named ones.

**Decision: Leave authenticated permissive policies in place.** They are无害 — they grant access that the restrictive policies already gate correctly. Removing and replacing them adds risk with no security benefit.

The ONE exception: `profiles` old "Allow all" included UPDATE for public which let anyone update any profile. This was already dropped in B1. The restrictive `rls_write_requires_admin_or_manager` AND `rls_delete_requires_admin` now gate write access. But we should also add a permissive policy so users can update their OWN profile (the restrictive admin-only one blocks self-service profile updates).

```sql
-- B2: Add user-self-service profile update permissive policy
-- This allows a user to update their own profile, which the restrictive
-- rls_write_requires_admin_or_manager would otherwise block.
-- Permissive policies are OR'd, so EITHER "you're admin/manager" OR "it's your own profile" grants access.
CREATE POLICY "User can update own profile" ON profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Step B2-Verify: Final comprehensive test

```bash
# 1. Anon: BLOCKED on all tables
node -e "const {createClient}=require('@supabase/supabase-js');const sb=createClient('https://iouuikteroixnsqazznc.supabase.co','sb_publishable_-9nZ5bjWkfV8_AFSSA3Qdg_LAMr8NxJ');Promise.all([sb.from('records').select('code').limit(1),sb.from('profiles').select('email').limit(1),sb.from('user_roles').select('role').limit(1),sb.from('audit_log').select('id').limit(1),sb.from('capas').select('id').limit(1),sb.from('notifications').select('id').limit(1)]).then(([r,p,u,a,c,n])=>console.log('ANON: records='+((r.data)?'LEAK':'OK')+' profiles='+((p.data)?'LEAK':'OK')+' roles='+((u.data)?'LEAK':'OK')+' audit='+((a.data)?'LEAK':'OK')+' capas='+((c.data)?'LEAK':'OK')+' notifs='+((n.data)?'LEAK':'OK')))"
```

All 6 must return OK (no data = blocked).

---

# Rollback Plan

## If Phase A fails (restrictive policies cause issues):

```sql
-- ROLLBACK A: Remove all restrictive policies
DROP POLICY IF EXISTS "rls_require_authenticated" ON records;
DROP POLICY IF EXISTS "rls_require_authenticated" ON audit_log;
DROP POLICY IF EXISTS "rls_require_authenticated" ON profiles;
DROP POLICY IF EXISTS "rls_require_authenticated" ON user_roles;
DROP POLICY IF EXISTS "rls_require_authenticated" ON capas;
DROP POLICY IF EXISTS "rls_require_authenticated" ON risks;
DROP POLICY IF EXISTS "rls_require_authenticated" ON process_interactions;
DROP POLICY IF EXISTS "rls_require_authenticated" ON processes;
DROP POLICY IF EXISTS "rls_require_authenticated" ON document_metadata;
DROP POLICY IF EXISTS "rls_require_authenticated" ON document_reviews;
DROP POLICY IF EXISTS "rls_require_authenticated" ON document_versions;
DROP POLICY IF EXISTS "rls_require_authenticated" ON notifications;
DROP POLICY IF EXISTS "rls_require_authenticated" ON error_reports;

DROP POLICY IF EXISTS "rls_write_requires_admin_or_manager" ON records;
DROP POLICY IF EXISTS "rls_write_requires_admin_or_manager" ON profiles;
DROP POLICY IF EXISTS "rls_delete_requires_admin" ON records;
DROP POLICY IF EXISTS "rls_delete_requires_admin" ON profiles;
DROP POLICY IF EXISTS "rls_write_requires_admin" ON user_roles;
DROP POLICY IF EXISTS "rls_write_requires_admin_or_manager" ON capas;
DROP POLICY IF EXISTS "rls_write_requires_admin_or_manager" ON risks;
DROP POLICY IF EXISTS "rls_write_requires_admin_or_manager" ON process_interactions;
DROP POLICY IF EXISTS "rls_write_requires_admin_or_manager" ON processes;
DROP POLICY IF EXISTS "rls_notifications_owner_only" ON notifications;
DROP POLICY IF EXISTS "rls_audit_readonly_excluding_insert" ON audit_log;
DROP POLICY IF EXISTS "rls_audit_readonly_excluding_delete" ON audit_log;
```

This restores the system to its current (insecure but working) state. Old permissive policies are untouched.

## If Phase B fails (old policies dropped, new ones insufficient):

```sql
-- ROLLBACK B: Re-create old insecure policies
-- Records
CREATE POLICY "Anon can read records" ON records FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert records" ON records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update records" ON records FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete records" ON records FOR DELETE TO anon USING (true);
-- Profiles
CREATE POLICY "Allow all" ON profiles FOR ALL TO public USING (true);
-- User roles
CREATE POLICY "Allow all" ON user_roles FOR ALL TO public USING (true);
-- Audit log
CREATE POLICY "Anon can read audit_log" ON audit_log FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert audit_log" ON audit_log FOR INSERT TO anon WITH CHECK (true);
-- All other "Allow all" tables
CREATE POLICY "Allow all" ON capas FOR ALL TO public USING (true);
CREATE POLICY "Allow all" ON risks FOR ALL TO public USING (true);
CREATE POLICY "Allow all" ON process_interactions FOR ALL TO public USING (true);
CREATE POLICY "Allow all" ON processes FOR ALL TO public USING (true);
CREATE POLICY "Allow all" ON notifications FOR ALL TO public USING (true);
-- Document tables
CREATE POLICY "Allow write for admin/manager" ON document_metadata FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Allow view for authenticated" ON document_metadata FOR SELECT TO public USING (auth.role() = 'authenticated');
CREATE POLICY "Allow write for admin/manager" ON document_reviews FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Allow view for authenticated" ON document_reviews FOR SELECT TO public USING (auth.role() = 'authenticated');
CREATE POLICY "Allow write for admin/manager" ON document_versions FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Allow view for authenticated" ON document_versions FOR SELECT TO public USING (auth.role() = 'authenticated');
-- Error reports
CREATE POLICY "Allow insert for all" ON error_reports FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow select for admins" ON error_reports FOR SELECT TO public USING (true);
CREATE POLICY "Allow update for admins" ON error_reports FOR UPDATE TO public USING (true);
```

---

# Dry-Run Script (No Data Modifications)

This script validates everything in a transaction and rolls back. Zero side effects.

```sql
-- ═══════════════════════════════════════════════════════════
-- DRY RUN: Full RLS migration in a transaction, then rollback.
-- Use this to verify SQL syntax and policy names before real execution.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- A1: Add restrictive "require authenticated" to all tables
CREATE POLICY "rls_require_authenticated" ON records
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON audit_log
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON profiles
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON user_roles
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON capas
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON risks
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON process_interactions
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON processes
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON document_metadata
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON document_reviews
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON document_versions
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON notifications
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');
CREATE POLICY "rls_require_authenticated" ON error_reports
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.role() = 'authenticated');

-- A2: Add role-aware restrictive policies for write operations
CREATE POLICY "rls_write_requires_admin_or_manager" ON records
  AS RESTRICTIVE FOR INSERT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "rls_write_requires_admin_or_manager" ON records
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "rls_delete_requires_admin" ON records
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "rls_write_requires_admin_or_manager" ON profiles
  AS RESTRICTIVE FOR INSERT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "rls_write_requires_admin_or_manager" ON profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "rls_delete_requires_admin" ON profiles
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "rls_write_requires_admin" ON user_roles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "rls_write_requires_admin_or_manager" ON capas
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "rls_write_requires_admin_or_manager" ON risks
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "rls_write_requires_admin_or_manager" ON process_interactions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "rls_write_requires_admin_or_manager" ON processes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "rls_notifications_owner_only" ON notifications
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "rls_audit_readonly_excluding_insert" ON audit_log
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false);
CREATE POLICY "rls_audit_readonly_excluding_delete" ON audit_log
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- B1: Drop old insecure permissive policies
DROP POLICY IF EXISTS "Anon can read records" ON records;
DROP POLICY IF EXISTS "Anon can insert records" ON records;
DROP POLICY IF EXISTS "Anon can update records" ON records;
DROP POLICY IF EXISTS "Anon can delete records" ON records;
DROP POLICY IF EXISTS "Anon can read audit_log" ON audit_log;
DROP POLICY IF EXISTS "Anon can insert audit_log" ON audit_log;
DROP POLICY IF EXISTS "Allow all" ON profiles;
DROP POLICY IF EXISTS "Allow all" ON user_roles;
DROP POLICY IF EXISTS "Allow all" ON capas;
DROP POLICY IF EXISTS "Allow all" ON risks;
DROP POLICY IF EXISTS "Allow all" ON process_interactions;
DROP POLICY IF EXISTS "Allow all" ON processes;
DROP POLICY IF EXISTS "Allow all" ON notifications;
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_metadata;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_metadata;
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_reviews;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_reviews;
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_versions;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_versions;
DROP POLICY IF EXISTS "Allow insert for all" ON error_reports;
DROP POLICY IF EXISTS "Allow select for admins" ON error_reports;
DROP POLICY IF EXISTS "Allow update for admins" ON error_reports;

-- B2: Self-service profile update
CREATE POLICY "User can update own profile" ON profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verify final state
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, permissive DESC, cmd;

-- ROLLBACK — dry run, undo everything
ROLLBACK;
```

---

# Google API Removal Plan

## Step G1: Delete dead code (zero risk)

- Delete `src/utils/driveUtils.ts` (0 imports, 57 lines of dead code)

## Step G2: Stub ProceduresPage "Archive" tab

Replace the live Drive API browser with a disabled state. Keep the "Digital Procedures" tab fully functional.

Changes to `src/pages/ProceduresPage.tsx`:
1. Remove `API_KEY` and `PROCEDURES_FOLDER_ID` constants
2. Remove `DriveItem` interface, `getPreviewUrl()`, `getEditUrl()`, `fetchFolderFiles()`
3. Remove `getAccessToken` import from `@/lib/auth`
4. Remove Drive-related state: `files`, `folderStack`, `driveSearch`, `debouncedDriveSearch`, `loading`
5. Remove `loadDriveFiles` callback and its effects
6. In the Tabs component: Remove the `<TabsTrigger value="archive">` element
7. Remove the `{activeTab === "archive" && (...)}` block entirely
8. Keep `activeTab` state but default to `"digital"` only
9. Keep all "Digital Procedures" code untouched

## Step G3: Remove env vars

From `.env.local`, remove:
- `VITE_GOOGLE_API_KEY`
- `VITE_PROCEDURES_FOLDER_ID` (if present)

## Step G4: Build verification

```bash
cd /home/kepa/qms-forge && npx tsc --noEmit && npx vite build
```

---

# Step-by-Step Execution Order (FINAL)

```
╔══════════════════════════════════════════════════════════════╗
║  PHASE 0: PRE-FLIGHT                                       ║
╠══════════════════════════════════════════════════════════════╣
║  0a. Run dry-run SQL script (transaction + rollback)       ║
║  0b. Baseline test: Verify anon CAN read (current state)    ║
║  0c. Screenshot current pg_policies state                   ║
║  0d. Verify all 3 users have user_roles entries             ║
║  0e. Verify notifications.user_id column exists              ║
╠══════════════════════════════════════════════════════════════╣
║  PHASE A: ZERO-DOWNTIME RLS HARDENING                      ║
╠══════════════════════════════════════════════════════════════╣
║  A1. CREATE restrictive "require authenticated" on 13 tables║
║  A1-V. Test: anon MUST be blocked on all tables             ║
║  A2. CREATE role-aware restrictive policies for writes      ║
║  A2-V. Test: app login + record operations still work       ║
║  A2-V2. Test: anon STILL blocked (restrictives stack)       ║
║  *** PAUSE: 5-minute live app verification window ***       ║
╠══════════════════════════════════════════════════════════════╣
║  PHASE B: CLEANUP (only after A2-V passes)                  ║
╠══════════════════════════════════════════════════════════════╣
║  B1. DROP old insecure anon/public permissive policies      ║
║  B1-V. Test: anon still blocked + app still works           ║
║  B2. CREATE "User can update own profile" permissive        ║
║  B2-V. Final comprehensive anon + auth test                 ║
╠══════════════════════════════════════════════════════════════╣
║  PHASE G: GOOGLE API REMOVAL                               ║
╠══════════════════════════════════════════════════════════════╣
║  G1. Delete src/utils/driveUtils.ts                         ║
║  G2. Stub ProceduresPage Archive tab + remove Drive code    ║
║  G3. Remove VITE_GOOGLE_API_KEY from .env.local             ║
║  G4. tsc --noEmit + vite build                              ║
╠══════════════════════════════════════════════════════════════╣
║  PHASE F: FINAL VERIFICATION                               ║
╠══════════════════════════════════════════════════════════════╣
║  F1. Anon key: BLOCKED on all 6 key tables                  ║
║  F2. Authenticated user: record list loads + CRUD works     ║
║  F3. service_role: migration scripts still work              ║
║  F4. Update MIGRATION_SAFETY_REPORT.md status               ║
║  F5. Git commit with message referencing this plan          ║
╚══════════════════════════════════════════════════════════════╝
```

---

# service_role Safety Guarantee

| Statement | Truth |
|---|---|
| `service_role` bypasses RLS | ✅ Verified: `rolbypassrls = true` |
| Migration scripts use service_role | ✅ Scripts use `SUPABASE_SERVICE_ROLE_KEY` env var |
| Phase A/B changes affect service_role? | ❌ Never — bypassrls skips all policy evaluation |
| CLI `npx supabase db query --linked` | Uses platform admin, also bypasses RLS |

**Migration scripts, backend processes, and CLI operations will never be affected by any RLS change.**

---

*Awaiting approval.*