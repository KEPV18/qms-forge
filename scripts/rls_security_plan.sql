# RLS Security Migration Plan — QMS Forge

**Date:** 2026-04-21
**Status:** DRAFT — NOT YET APPLIED
**Prerequisite:** This MUST be reviewed and approved by Batman before execution.

---

# Part 1: RLS Policy Changes

## Principle

- `service_role` (supabase_admin) has `bypassrls = true` — **never affected by any policy change.** Migration scripts, backend code, and CLI queries using the service_role key continue working regardless.
- Only `anon` and `authenticated` roles are constrained by RLS policies.
- Goal: Remove ALL `anon` access. Restrict `authenticated` access by role where appropriate.

## Policy Classification

| Table | Used by Frontend | Has Data | Current Risk | Priority |
|---|---|---|---|---|
| `records` | ✅ (SupabaseStorage, recordStorage) | 35 rows | 🔴 anon FULL CRUD | P0 |
| `profiles` | ✅ (useAuth) | 3 rows | 🔴 public FULL CRUD | P0 |
| `user_roles` | ✅ (useAuth) | 3 rows | 🔴 public FULL CRUD | P0 |
| `audit_log` | ✅ (auditLog.ts) | 35 rows | 🔴 anon SELECT+INSERT | P0 |
| `capas` | ✅ (capaRegisterService) | 0 rows | 🟡 public CRUD | P1 |
| `risks` | ✅ (riskRegisterService) | 0 rows | 🟡 public CRUD | P1 |
| `process_interactions` | ✅ (processInteractionService) | 0 rows | 🟡 public CRUD | P1 |
| `notifications` | ✅ (hooks) | 0 rows | 🟡 public CRUD | P1 |
| `document_metadata` | ❌ NOT USED | 0 rows | ⚠️ public CRUD (but has role check) | P2 |
| `document_reviews` | ❌ NOT USED | 0 rows | ⚠️ public CRUD (but has role check) | P2 |
| `document_versions` | ❌ NOT USED | 0 rows | ⚠️ public CRUD (but has role check) | P2 |
| `processes` | ❌ NOT USED | 0 rows | 🟡 public CRUD | P2 |
| `error_reports` | ❌ NOT USED | 0 rows | ⚠️ Less risky (INSERT-only public, SELECT for admins) | P2 |

---

## Step 1: DROP Policies (P0 Tables)

```sql
-- ═══════════════════════════════════════════════════════════
-- STEP 1: DROP ALL INSECURE POLICIES — P0 TABLES
-- These are the tables with real data and active frontend usage.
-- ═══════════════════════════════════════════════════════════

-- records: Drop 4 anon policies + 4 authenticated policies (replacing with role-aware)
DROP POLICY IF EXISTS "Anon can read records" ON records;
DROP POLICY IF EXISTS "Anon can insert records" ON records;
DROP POLICY IF EXISTS "Anon can update records" ON records;
DROP POLICY IF EXISTS "Anon can delete records" ON records;
DROP POLICY IF EXISTS "Authenticated users can read records" ON records;
DROP POLICY IF EXISTS "Authenticated users can insert records" ON records;
DROP POLICY IF EXISTS "Authenticated users can update records" ON records;
DROP POLICY IF EXISTS "Authenticated users can delete records" ON records;

-- profiles: Drop 1 public ALL policy
DROP POLICY IF EXISTS "Allow all" ON profiles;

-- user_roles: Drop 1 public ALL policy
DROP POLICY IF EXISTS "Allow all" ON user_roles;

-- audit_log: Drop 2 anon policies + 2 authenticated policies
DROP POLICY IF EXISTS "Anon can read audit_log" ON audit_log;
DROP POLICY IF EXISTS "Anon can insert audit_log" ON audit_log;
DROP POLICY IF EXISTS "Authenticated users can read audit_log" ON audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert audit_log" ON audit_log;
```

### Impact Window
Between DROP and CREATE (next step), these tables have **ZERO policies**. Since RLS is enabled, this means:
- `anon` → BLOCKED entirely ✅
- `authenticated` → BLOCKED entirely ⚠️ (brief outage)
- `service_role` → Still works (bypassrls) ✅

**This window should be < 2 seconds if run as a single transaction.**

---

## Step 2: CREATE Secure Policies (P0 Tables)

```sql
-- ═══════════════════════════════════════════════════════════
-- STEP 2: CREATE SECURE POLICIES — P0 TABLES
-- ═══════════════════════════════════════════════════════════

-- ──── records ────
-- All authenticated users can read records
CREATE POLICY "Authenticated users can read records" ON records
  FOR SELECT TO authenticated
  USING (true);

-- Only admin and manager can create records
CREATE POLICY "Admin and manager can insert records" ON records
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Only admin and manager can update records
CREATE POLICY "Admin and manager can update records" ON records
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Only admin can delete records
CREATE POLICY "Admin can delete records" ON records
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ──── profiles ────
-- All authenticated users can read profiles (needed for user management UI)
CREATE POLICY "Authenticated users can read profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin and manager can insert profiles (user creation)
CREATE POLICY "Admin and manager can insert profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Only admin can delete profiles
CREATE POLICY "Admin can delete profiles" ON profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ──── user_roles ────
-- All authenticated users can read roles (needed for role display)
CREATE POLICY "Authenticated users can read roles" ON user_roles
  FOR SELECT TO authenticated
  USING (true);

-- Only admin can insert/update/delete roles
CREATE POLICY "Admin can manage roles" ON user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- ──── audit_log ────
-- All authenticated users can read audit log
CREATE POLICY "Authenticated users can read audit_log" ON audit_log
  FOR SELECT TO authenticated
  USING (true);

-- All authenticated users can insert audit log (system writes on behalf of logged-in user)
CREATE POLICY "Authenticated users can insert audit_log" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- No one can UPDATE or DELETE audit_log (append-only, no policy = denied)
```

---

## Step 3: DROP + CREATE Policies (P1 Tables — Data Tables, No Data Yet)

```sql
-- ═══════════════════════════════════════════════════════════
-- STEP 3: FIX P1 TABLES — Active frontend usage, no data yet
-- ═══════════════════════════════════════════════════════════

-- ──── capas ────
DROP POLICY IF EXISTS "Allow all" ON capas;
CREATE POLICY "Authenticated users can read capas" ON capas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and manager can modify capas" ON capas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Admin and manager can update capas" ON capas
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Admin can delete capas" ON capas
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ──── risks ────
DROP POLICY IF EXISTS "Allow all" ON risks;
CREATE POLICY "Authenticated users can read risks" ON risks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and manager can modify risks" ON risks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Admin and manager can update risks" ON risks
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Admin can delete risks" ON risks
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ──── process_interactions ────
DROP POLICY IF EXISTS "Allow all" ON process_interactions;
CREATE POLICY "Authenticated users can read process_interactions" ON process_interactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and manager can modify process_interactions" ON process_interactions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Admin and manager can update process_interactions" ON process_interactions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Admin can delete process_interactions" ON process_interactions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ──── notifications ────
DROP POLICY IF EXISTS "Allow all" ON notifications;
-- Users can only see their own notifications; user_id column must exist
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

---

## Step 4: FIX P2 Tables (Unused, But Fix for Hygiene)

```sql
-- ═══════════════════════════════════════════════════════════
-- STEP 4: FIX P2 TABLES — Unused but should not be public
-- ═══════════════════════════════════════════════════════════

-- ──── document_metadata ────
-- Already has role checks but applied TO public — fix to TO authenticated
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_metadata;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_metadata;
CREATE POLICY "Authenticated can read document_metadata" ON document_metadata
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admin and manager can write document_metadata" ON document_metadata
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- ──── document_reviews ────
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_reviews;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_reviews;
CREATE POLICY "Authenticated can read document_reviews" ON document_reviews
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admin and manager can write document_reviews" ON document_reviews
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- ──── document_versions ────
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_versions;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_versions;
CREATE POLICY "Authenticated can read document_versions" ON document_versions
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admin and manager can write document_versions" ON document_versions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- ──── processes ────
DROP POLICY IF EXISTS "Allow all" ON processes;
CREATE POLICY "Authenticated users can read processes" ON processes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and manager can write processes" ON processes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- ──── error_reports ────
-- Already somewhat safe, but tighten
DROP POLICY IF EXISTS "Allow insert for all" ON error_reports;
DROP POLICY IF EXISTS "Allow select for admins" ON error_reports;
DROP POLICY IF EXISTS "Allow update for admins" ON error_reports;
CREATE POLICY "Authenticated can insert error_reports" ON error_reports
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can read error_reports" ON error_reports
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update error_reports" ON error_reports
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
```

---

# Part 2: Rollback Script

**Run this ONLY if something breaks. It restores the original permissive policies.**

```sql
-- ═══════════════════════════════════════════════════════════
-- ROLLBACK: Restore original permissive policies
-- Run ONLY if secure policies cause issues
-- ═══════════════════════════════════════════════════════════

-- Drop ALL current policies first
DROP POLICY IF EXISTS "Authenticated users can read records" ON records;
DROP POLICY IF EXISTS "Admin and manager can insert records" ON records;
DROP POLICY IF EXISTS "Admin and manager can update records" ON records;
DROP POLICY IF EXISTS "Admin can delete records" ON records;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin and manager can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can read audit_log" ON audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert audit_log" ON audit_log;
DROP POLICY IF EXISTS "Authenticated users can read capas" ON capas;
DROP POLICY IF EXISTS "Admin and manager can modify capas" ON capas;
DROP POLICY IF EXISTS "Admin and manager can update capas" ON capas;
DROP POLICY IF EXISTS "Admin can delete capas" ON capas;
DROP POLICY IF EXISTS "Authenticated users can read risks" ON risks;
DROP POLICY IF EXISTS "Admin and manager can modify risks" ON risks;
DROP POLICY IF EXISTS "Admin and manager can update risks" ON risks;
DROP POLICY IF EXISTS "Admin can delete risks" ON risks;
DROP POLICY IF EXISTS "Authenticated users can read process_interactions" ON process_interactions;
DROP POLICY IF EXISTS "Admin and manager can modify process_interactions" ON process_interactions;
DROP POLICY IF EXISTS "Admin and manager can update process_interactions" ON process_interactions;
DROP POLICY IF EXISTS "Admin can delete process_interactions" ON process_interactions;
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated can read document_metadata" ON document_metadata;
DROP POLICY IF EXISTS "Admin and manager can write document_metadata" ON document_metadata;
DROP POLICY IF EXISTS "Authenticated can read document_reviews" ON document_reviews;
DROP POLICY IF EXISTS "Admin and manager can write document_reviews" ON document_reviews;
DROP POLICY IF EXISTS "Authenticated can read document_versions" ON document_versions;
DROP POLICY IF EXISTS "Admin and manager can write document_versions" ON document_versions;
DROP POLICY IF EXISTS "Authenticated users can read processes" ON processes;
DROP POLICY IF EXISTS "Admin and manager can write processes" ON processes;
DROP POLICY IF EXISTS "Authenticated can insert error_reports" ON error_reports;
DROP POLICY IF EXISTS "Admin can read error_reports" ON error_reports;
DROP POLICY IF EXISTS "Admin can update error_reports" ON error_reports;

-- Restore original unsafe policies
CREATE POLICY "Anon can read records" ON records FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert records" ON records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update records" ON records FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete records" ON records FOR DELETE TO anon USING (true);
CREATE POLICY "Authenticated users can read records" ON records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert records" ON records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update records" ON records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete records" ON records FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow all" ON profiles FOR ALL TO public USING (true);
CREATE POLICY "Allow all" ON user_roles FOR ALL TO public USING (true);

CREATE POLICY "Anon can read audit_log" ON audit_log FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert audit_log" ON audit_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated users can read audit_log" ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit_log" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all" ON capas FOR ALL TO public USING (true);
CREATE POLICY "Allow all" ON risks FOR ALL TO public USING (true);
CREATE POLICY "Allow all" ON process_interactions FOR ALL TO public USING (true);
CREATE POLICY "Allow all" ON processes FOR ALL TO public USING (true);
CREATE POLICY "Allow all" ON notifications FOR ALL TO public USING (true);

CREATE POLICY "Allow write for admin/manager" ON document_metadata FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Allow view for authenticated" ON document_metadata FOR SELECT TO public USING (auth.role() = 'authenticated');
CREATE POLICY "Allow write for admin/manager" ON document_reviews FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Allow view for authenticated" ON document_reviews FOR SELECT TO public USING (auth.role() = 'authenticated');
CREATE POLICY "Allow write for admin/manager" ON document_versions FOR ALL TO public USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
CREATE POLICY "Allow view for authenticated" ON document_versions FOR SELECT TO public USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for all" ON error_reports FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow select for admins" ON error_reports FOR SELECT TO public USING (true);
CREATE POLICY "Allow update for admins" ON error_reports FOR UPDATE TO public USING (true);
```

---

# Part 3: Impact Simulation

## What Breaks Immediately After Applying

| Category | Effect | Severity |
|---|---|---|
| **Unauthenticated users** | ALL access denied to every table. App login page still works (Supabase Auth is separate from RLS). | ✅ Intended |
| **Authenticated users (viewer role)** | Can READ records, profiles, roles, audit_log, capas, risks, process_interactions. Cannot INSERT/UPDATE/DELETE anything. | ⚠️ May need a `viewer` role if such users exist. Currently only `admin` + `manager` roles exist. |
| **Authenticated managers** | Can READ all + INSERT/UPDATE records, profiles. Cannot DELETE records or manage user_roles. | ✅ Correct |
| **Authenticated admins** | Full access. | ✅ Correct |
| **service_role (scripts, backend)** | Completely unaffected. `bypassrls = true`. | ✅ Safe |
| **audit_log** | Becomes append-only (no UPDATE/DELETE for anyone). | ✅ Intended — audit integrity |
| **notifications** | Requires `user_id` column matching `auth.uid()`. **CRITICAL: Check if `notifications` table has a `user_id` column.** | 🔴 VERIFY |

## Endpoints That Become Restricted

| Operation | Before | After | Who Can Still Do It |
|---|---|---|---|
| `SELECT records` | Anyone (anon) | Authenticated only | All logged-in users |
| `INSERT records` | Anyone (anon) | Admin + Manager only | admin, manager |
| `UPDATE records` | Anyone (anon) | Admin + Manager only | admin, manager |
| `DELETE records` | Anyone (anon) | Admin only | admin |
| `SELECT profiles` | Anyone (public) | Authenticated only | All logged-in users |
| `INSERT profiles` | Anyone (public) | Admin + Manager only | admin, manager |
| `UPDATE profiles` | Anyone (public) | Own profile only | The user themselves |
| `DELETE profiles` | Anyone (public) | Admin only | admin |
| `SELECT user_roles` | Anyone (public) | Authenticated only | All logged-in users |
| `INSERT/UPDATE/DELETE user_roles` | Anyone (public) | Admin only | admin |
| `UPDATE/DELETE audit_log` | N/A (was possible) | BLOCKED for everyone | Nobody (append-only) |
| All `capas`, `risks`, `process_interactions` | Anyone (public) | Authenticated read, admin/manager write | See above |
| `notifications` | Anyone (public) | Own user_id only | The user themselves |

## ⚠️ Pre-Flight Checklist Before Execution

1. **Verify `notifications` table has `user_id` column** — if not, the `USING (user_id = auth.uid())` policy will fail at creation time.
2. **Verify no external scripts** rely on anon access to these tables.
3. **Ensure all 3 auth users have correct roles** in `user_roles` — if an admin has no `user_roles` entry, they'll be locked out of writes on day one.

---

# Part 4: Google API Removal Plan

## Current State

| File | Line | Google Dependency | Dead Code? |
|---|---|---|---|
| `src/pages/ProceduresPage.tsx` | 21, 70-77 | Live `fetch()` to Drive API v3 | ❌ Active — "Archive" tab |
| `src/utils/driveUtils.ts` | 1 | `VITE_GOOGLE_API_KEY` + preview URL builders | ✅ Dead — zero imports |
| `src/lib/driveService.ts` | — | Stub (no API calls) | ✅ Safe stub |
| `src/lib/auth.ts` | — | Stub (`getAccessToken` returns null) | ✅ Safe stub |
| `.env.local` | — | `VITE_GOOGLE_API_KEY` still present | ⚠️ Bundled into JS |

## Removal Strategy

### Phase A: Immediate — Remove Dead Code (Zero risk)

1. **Delete `src/utils/driveUtils.ts`** — zero imports, pure dead weight.
2. **Remove `VITE_GOOGLE_API_KEY` from `.env.local`** — but this will break ProceduresPage's "Archive" tab immediately.

### Phase B: ProceduresPage — Replace Drive Browser with Stub

The "Archive" tab in ProceduresPage is the ONLY live Google Drive consumer. Strategy:

1. **Keep the ProceduresPage component** — it has a "Digital Procedures" tab that works fine (no Google dependency).
2. **Stub the "Archive" tab** — Replace the Drive file browser with a message: "Drive integration has been migrated. Archive browsing is no longer available." 
3. **Remove from ProceduresPage**:
   - `API_KEY` constant (line 21)
   - `PROCEDES_FOLDER_ID` constant (line 22) 
   - `DriveItem` interface (line 24)
   - `getPreviewUrl()`, `getEditUrl()` functions (lines 34-52)
   - `fetchFolderFiles()` function (lines 70-80)
   - All state related to Drive: `files`, `folderStack`, `driveSearch`, etc.
   - The `activeTab === "archive"` rendering block
4. **Remove the "Archive" TabsTrigger** from the UI.
5. **Run `npx tsc --noEmit`** to verify no breakage.

### Phase C: Environment Cleanup

1. Remove `VITE_GOOGLE_API_KEY` from `.env.local`.
2. Remove `VITE_PROCEDURES_FOLDER_ID` from `.env.local` (if present).
3. Rebuild and verify app loads.
4. **Optional:** Remove `driveService.ts` stub — but 12 files still import types from it. Deferred to future cleanup.

---

# Part 5: Step-by-Step Execution Order

```
PRE-FLIGHT (must do first):
  1. Verify notifications table has user_id column
  2. Verify all 3 auth users have user_roles entries
  3. Take screenshot of current pg_policies for forensic backup

EXECUTION ORDER:
  Step 1: Save rollback script to file (ready to run if needed)
  Step 2: Delete src/utils/driveUtils.ts (dead code, zero risk)
  Step 3: Stub ProceduresPage Archive tab + remove Google API code
  Step 4: Remove VITE_GOOGLE_API_KEY from .env.local
  Step 5: tsc --noEmit + vite build verification
  Step 6: Run RLS Step 1 (DROP P0 policies)
  Step 7: Run RLS Step 2 (CREATE P0 policies)
  Step 8: Run RLS Step 3 (P1 tables)
  Step 9: Run RLS Step 4 (P2 tables)
  Step 10: Verify with anon key — confirm ALL reads denied
  Step 11: Verify with authenticated user — confirm reads work
  Step 12: Verify with admin — confirm writes work
  Step 13: If ANY step fails → run rollback script → diagnose

TOTAL ESTIMATED TIME: 10-15 minutes
DOWNTIME WINDOW: < 5 seconds (between DROP and CREATE for P0)
```

---

*Awaiting Batman's approval to execute.*