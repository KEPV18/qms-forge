# Migration Safety Report — QMS Forge: Google Sheets → Supabase

**Date:** 2026-04-21
**Auditor:** Robin
**Project:** `/home/kepa/qms-forge/`

---

## 1. Codebase Residual Reference Scan

| Category | Finding | Verdict |
|---|---|---|
| `googleSheets` imports | 34 files still import from `@/lib/googleSheets` — BUT it's a re-export layer to `SupabaseStorage.ts`. No Sheets API calls. | ⚠️ PASS (indirect) |
| `driveService` imports | 12 files import from `@/lib/driveService` — stub returns `null/[]/noop`. No Drive API calls at runtime. | ⚠️ PASS (stub) |
| Sheets API URLs | Zero `sheets.googleapis.com` references in service layer | ✅ PASS |
| `VITE_GOOGLE_API_KEY` | `ProceduresPage.tsx` (line 21) + `driveUtils.ts` (line 1) still read this key and make **live Google Drive API calls** | ❌ FAIL |
| `getAccessToken()` | `auth.ts` returns `null` (stub). `Header.tsx`, `TopNav.tsx`, `ProceduresPage.tsx` call it. Header/TopNav just set `driveConnected=false` (safe). ProceduresPage falls back to unauthenticated fetch (breaks without key). | ⚠️ PASS (fragile) |

**Runtime Dependencies on Google Services:**
1. ❌ **`ProceduresPage.tsx`** — Makes direct `fetch()` to `https://www.googleapis.com/drive/v3/files` using API key. This is a **live Google API dependency**.
2. ⚠️ `AutomatedAuditModal.tsx` — Calls `renameDriveFile`, `getFileMetadata`, `listFolderFiles` from drive stubs. Returns null/empty. Won't crash but audit checks are meaningless.
3. ⚠️ `QuickActions.tsx` — Calls `searchProjectDrive`, `uploadFileToDrive`, `createDriveFolder` from stubs. Returns empty. UI may show nothing.

---

## 2. Supabase Data Verification

| Check | Result | Verdict |
|---|---|---|
| Record count | 35 / 35 | ✅ PASS |
| Code uniqueness | 0 duplicates | ✅ PASS |
| All fields populated | 35/35 for folder_link, template_link, last_serial, last_file_date, reviewed_by, file_reviews | ✅ PASS |
| Empty field gaps | `audit_status`: 3 null, `review_date`: 26 null | ✅ PASS (expected — old data) |
| `file_reviews` JSONB | All 35 records have populated object data | ✅ PASS |
| Sample 10 records | Full field parity verified — all 10 match expected structure | ✅ PASS |
| Category distribution | 7 categories, counts match original | ✅ PASS |

**Sheets backup comparison:** 35 records migrated = 35 records in Supabase. Full count match.

---

## 3. RLS Policy Validation

### 🔴 CRITICAL FAILURE — Public Data Leakage

| Table | RLS Enabled | Anon Access | Risk |
|---|---|---|---|
| `records` | ✅ Yes | ❌ **FULL CRUD** (SELECT/INSERT/UPDATE/DELETE) | 🔴 CRITICAL |
| `audit_log` | ✅ Yes | ❌ **SELECT + INSERT** | 🔴 CRITICAL |
| `profiles` | ✅ Yes | ❌ **FULL CRUD** (public) | 🔴 CRITICAL |
| `user_roles` | ✅ Yes | ❌ **FULL CRUD** (public) | 🔴 CRITICAL |
| `capas` | ✅ Yes | ❌ **FULL CRUD** (public) | 🔴 HIGH |
| `risks` | ✅ Yes | ❌ **FULL CRUD** (public) | 🔴 HIGH |
| `process_interactions` | ✅ Yes | ❌ **FULL CRUD** (public) | 🔴 HIGH |
| `processes` | ✅ Yes | ❌ **FULL CRUD** (public) | 🔴 HIGH |
| `notifications` | ✅ Yes | ❌ **FULL CRUD** (public) | 🟡 MEDIUM |
| `document_metadata` | ✅ Yes | ⚠️ FULL CRUD (public — "admin/manager" policy name but unrestricted) | 🔴 HIGH |
| `document_reviews` | ✅ Yes | ⚠️ FULL CRUD (public — same issue) | 🔴 HIGH |
| `document_versions` | ✅ Yes | ⚠️ FULL CRUD (public — same issue) | 🔴 HIGH |
| `error_reports` | ✅ Yes | INSERT: public, SELECT/UPDATE: anon blocked | ✅ OK |

**Verified exploit:** Using only the publishable key (`sb_publishable_...`) with **no authentication**, an attacker can:
- ✅ Read all 35 records
- ✅ Insert new records
- ✅ Delete any record
- ✅ Read and modify `profiles` and `user_roles` (admin access escalation)

**This means anyone with the frontend bundle can fully own the database.**

---

## 4. Data Integrity

| Check | Result | Verdict |
|---|---|---|
| `code` uniqueness | 0 duplicates across 35 records | ✅ PASS |
| `last_serial` uniqueness | 0 duplicates | ✅ PASS |
| `file_reviews` completeness | 35/35 populated | ✅ PASS |
| Audit log entries | 35 entries (1 per record = creation migration log) | ✅ PASS |
| Audit log `performed_by` | 35/35 populated | ✅ PASS |
| Orphan audit entries (no matching record) | None | ✅ PASS |

---

## Final Verdict

| Section | Status |
|---|---|
| 1. Codebase residual references | ⚠️ CONDITIONAL PASS |
| 2. Data verification | ✅ PASS |
| 3. RLS policy validation | ❌ **FAIL — CRITICAL** |
| 4. Data integrity | ✅ PASS |

### Overall: ❌ **MIGRATION NOT SAFE FOR PRODUCTION**

---

## Mandatory Remediation Before Any New Features

### Priority 1 — RLS Hardening (BLOCKER)

**Drop all anon/public ALL policies.** Replace with authenticated-only:

```sql
-- Step 1: DROP dangerous policies
DROP POLICY IF EXISTS "Anon can read records" ON records;
DROP POLICY IF EXISTS "Anon can insert records" ON records;
DROP POLICY IF EXISTS "Anon can update records" ON records;
DROP POLICY IF EXISTS "Anon can delete records" ON records;
DROP POLICY IF EXISTS "Anon can read audit_log" ON audit_log;
DROP POLICY IF EXISTS "Anon can insert audit_log" ON audit_log;
DROP POLICY IF EXISTS "Allow all" ON capas;
DROP POLICY IF EXISTS "Allow all" ON risks;
DROP POLICY IF EXISTS "Allow all" ON process_interactions;
DROP POLICY IF EXISTS "Allow all" ON processes;
DROP POLICY IF EXISTS "Allow all" ON notifications;
DROP POLICY IF EXISTS "Allow all" ON profiles;
DROP POLICY IF EXISTS "Allow all" ON user_roles;
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_metadata;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_metadata;
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_reviews;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_reviews;
DROP POLICY IF EXISTS "Allow write for admin/manager" ON document_versions;
DROP POLICY IF EXISTS "Allow view for authenticated" ON document_versions;

-- Step 2: Create proper policies (authenticated-only, role-aware)
-- Records
CREATE POLICY "Authenticated users can read records" ON records
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can insert records" ON records
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "Admins and managers can update records" ON records
  FOR UPDATE TO authenticated USING (true) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "Admins can delete records" ON records
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Profiles: users can read all, update own
CREATE POLICY "Authenticated users can read profiles" ON profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- User roles: admin-only write, authenticated read
CREATE POLICY "Authenticated users can read roles" ON user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Audit log: authenticated read, authenticated insert
CREATE POLICY "Authenticated users can read audit_log" ON audit_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit_log" ON audit_log
  FOR INSERT TO authenticated WITH CHECK (true);
```

### Priority 2 — ProceduresPage Google API Dependency

Either:
- **A) Stub `ProceduresPage`** — disable Drive file browser, show "Not available after migration" message.
- **B) Remove the page** — if no longer needed in a Supabase-only world.
- **C) Keep with warning** — acknowledge dependency, accept it as a known exception.

### Priority 3 — Import Cleanup (Non-blocking)

- 34 files importing `from "@/lib/googleSheets"` → should import from `@/lib/SupabaseStorage` directly eventually.
- 12 files importing `from "@/lib/driveService"` → should be removed when Drive features are fully deprecated.
- These work fine via re-export but create confusion for future maintenance.

---

## Hidden Risks

1. **`document_metadata/reviews/versions` tables** have policies named "Allow write for admin/manager" but actually apply to `{public}` — the role check is NOT in the policy logic, just in the name. Anyone can write.
2. **`VITE_GOOGLE_API_KEY`** is still in `.env.local` and bundled into the frontend. Anyone can extract it from the JS bundle and make Drive API calls under the project's quota.
3. **No rate limiting** on Supabase — the publishable key + permissive RLS means anyone can script bulk reads/deletes.
4. **Audit log is append-only but world-readable** — anon can read all audit history (until RLS fixed).

---

*This audit MUST be resolved before any new feature work. The RLS issue is a production blocker.*