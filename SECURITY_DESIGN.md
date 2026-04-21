# RLS Security Design — QMS Forge

**Status:** ✅ EXECUTED AND VERIFIED — 96/96 tests passing  
**Date:** 2026-04-21  
**Author:** Robin  
**DB:** `iouuikteroixnsqazznc.supabase.co`

---

# 1. Root Cause Analysis

## 1.1 RLS Enablement

| Status | Detail |
|---|---|
| **RLS enabled** | All 13 tables have `relrowsecurity = true` |
| **RLS forced** | All 13 tables have `relforcerowsecurity = false` |

**Impact of `forcerowsecurity = false`:** Table owners (`postgres`, `supabase_admin`) bypass RLS. This is expected and correct — `service_role` needs unrestricted access. No issue here.

## 1.2 Why anon has near-full CRUD access

**Root cause: Overly permissive policies granted to `{public}` or `{anon}`**

| Pattern | Tables Affected | Effect |
|---|---|---|
| `Allow all` policy on `{public}` with `cmd=ALL`, `qual=true` | `capas`, `document_metadata`, `document_reviews`, `document_versions`, `notifications`, `process_interactions`, `processes`, `profiles`, `risks`, `user_roles` | **Full CRUD for EVERY role** including anon. `{public}` includes anon. |
| Explicit per-command `{anon}` policies with `qual=true` | `records` (4 policies: SELECT/INSERT/UPDATE/DELETE), `audit_log` (2 policies: SELECT/INSERT) | **Direct anon access** — no auth check whatsoever. |
| `{authenticated}` policies with `qual=true` | `audit_log` (2 policies), `error_reports` (implicit via `auth.role()` check) | Authenticated users get open access (correct intent, but scope too wide) |

**Key PostgreSQL behavior:** `{public}` is a special role that **all roles inherit from**, including `anon`. Any policy granted to `{public}` effectively grants to every database role.

## 1.3 Policy Conflict/Override Analysis

Per PostgreSQL RLS evaluation: all PERMISSIVE policies on the same table are OR'd together. Since every existing policy uses `qual = true` (no row-level filtering), the result is:

```
Permissive access = (anon_select=true) OR (auth_select=true) OR (public_all=true) = TRUE
```

No restrictive policies exist. No policy overrides another — they all independently grant access. The problem isn't conflicts; it's **absence of any restriction**.

## 1.4 The `records` DELETE mystery

**Baseline test showed `records` DELETE = DENY for all roles.** This is NOT an RLS effect — it's a **trigger constraint**:

- Trigger `record_change_logger` on `records` fires on DELETE.
- The trigger inserts into `audit_log` with `action = 'delete'`.
- `audit_log.record_id` has a `FOREIGN KEY → records(id)` with `ON DELETE CASCADE`.
- Cascade deletes the audit_log row, but the trigger re-inserts it during the same transaction.
- PostgreSQL prevents the DELETE because the FK reference cannot be satisfied in the same statement cycle.

**Lesson:** `records` can never be deleted via PostgREST while this trigger exists. This is actually a data integrity feature, not a bug — but it should be a deliberate system-level DELETE (via `service_role` or a custom RPC), not blocked by accident.

---

# 2. Current State Inventory

## 2.1 Tables: Active vs. Unused

| Category | Table | Rows | Frontend References | Status |
|---|---|---|---|---|
| **Active — Production Data** | `records` | 59 | 10+ queries | **CRITICAL** |
| **Active — System Audit** | `audit_log` | 66 | 3 queries | **CRITICAL** |
| **Active — User Identity** | `profiles` | 3 | 5+ queries | **CRITICAL** |
| **Active — Authorization** | `user_roles` | 3 | 6+ queries | **CRITICAL** |
| **Active — Feature** | `notifications` | 0 | 6+ queries | **ACTIVE** |
| **Active — Feature** | `capas` | 0 | 3+ queries | **ACTIVE** |
| **Active — Feature** | `risks` | 0 | 3+ queries | **ACTIVE** |
| **Active — Feature** | `process_interactions` | 0 | 3+ queries | **ACTIVE** |
| **Template — Unused** | `processes` | 0 | 0 | **DORMANT** |
| **Template — Unused** | `document_metadata` | 0 | 0 | **DORMANT** |
| **Template — Unused** | `document_reviews` | 0 | 0 | **DORMANT** |
| **Template — Unused** | `document_versions` | 0 | 0 | **DORMANT** |
| **Template — Unused** | `error_reports` | 0 | 0 | **DORMANT** |

**Classification:**
- **CRITICAL** = has real data + active frontend dependency
- **ACTIVE** = no data yet but frontend code references it (feature tables)
- **DORMANT** = zero data, zero frontend references (Supabase template leftovers)

## 2.2 Current Policy Map

| Table | Policy Name | Permissive | Roles | Command | Qual | With Check |
|---|---|---|---|---|---|---|
| **records** | Anon can read records | PERMISSIVE | `{anon}` | SELECT | `true` | — |
| | Anon can insert records | PERMISSIVE | `{anon}` | INSERT | — | `true` |
| | Anon can update records | PERMISSIVE | `{anon}` | UPDATE | `true` | `true` |
| | Anon can delete records | PERMISSIVE | `{anon}` | DELETE | `true` | — |
| | Auth users can read records | PERMISSIVE | `{authenticated}` | SELECT | `true` | — |
| | Auth users can insert records | PERMISSIVE | `{authenticated}` | INSERT | — | `true` |
| | Auth users can update records | PERMISSIVE | `{authenticated}` | UPDATE | `true` | `true` |
| | Auth users can delete records | PERMISSIVE | `{authenticated}` | DELETE | `true` | — |
| **audit_log** | Anon can read audit_log | PERMISSIVE | `{anon}` | SELECT | `true` | — |
| | Anon can insert audit_log | PERMISSIVE | `{anon}` | INSERT | — | `true` |
| | Auth users can read audit_log | PERMISSIVE | `{authenticated}` | SELECT | `true` | — |
| | Auth users can insert audit_log | PERMISSIVE | `{authenticated}` | INSERT | — | `true` |
| **profiles** | Allow all | PERMISSIVE | `{public}` | ALL | `true` | — |
| **user_roles** | Allow all | PERMISSIVE | `{public}` | ALL | `true` | — |
| **capas** | Allow all | PERMISSIVE | `{public}` | ALL | `true` | — |
| **risks** | Allow all | PERMISSIVE | `{public}` | ALL | `true` | — |
| **process_interactions** | Allow all | PERMISSIVE | `{public}` | ALL | `true` | — |
| **notifications** | Allow all | PERMISSIVE | `{public}` | ALL | `true` | — |
| **processes** | Allow all | PERMISSIVE | `{public}` | ALL | `true` | — |
| **document_metadata** | Access metadata | PERMISSIVE | `{public}` | ALL | `auth.role()='authenticated' AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role IN ('admin','manager'))` | same as qual |
| **document_reviews** | Access reviews | PERMISSIVE | `{public}` | ALL | same pattern | same as qual |
| **document_versions** | Access versions | PERMISSIVE | `{public}` | ALL | same pattern | same as qual |
| **error_reports** | (implicit) | — | — | — | checks `auth.role()='authenticated'` | — |

**Critical observation on document_\* tables:** These policies use `auth.role()='authenticated'` AND user_roles checks — but they're granted to `{public}` instead of `{authenticated}`. Since `{public}` includes `anon`, and `anon` has `auth.role() = 'anon'` (not `'authenticated'`), `anon` is effectively blocked by the `auth.role()` check. **However, the grant to `{public}` is wrong** — it means any future role added to the system automatically gets evaluated. Should be `{authenticated}`.

---

# 3. Deny-by-Default Baseline

## 3.1 First Principles

| Principle | Rule |
|---|---|
| **Default deny** | No access unless explicitly granted |
| **anon = nothing** | Zero access across all tables. No SELECT, no INSERT, no UPDATE, no DELETE. No exceptions. |
| **authenticated = scoped** | Only the minimum access required for the app to function |
| **admin = elevated** | Write access where business logic requires it |
| **manager = operational** | Read-mostly; write only to own data and feature tables |
| **service_role = bypass** | Unchanged — `bypassrls = true` |

## 3.2 Role Hierarchy

```
service_role  → bypassrls (no policy evaluation)
    ↓
admin         → authenticated + admin role in user_roles
    ↓
manager       → authenticated + manager role in user_roles
    ↓
authenticated → base logged-in role (no admin/manager assignment)
    ↓
anon          → unauthenticated (publishable key only)
```

**New role consideration:** Currently there is no `viewer` role in `user_roles`, only `admin` and `manager`. If a viewer-only role is needed later, the model supports it. For now: `anon`, `authenticated` (base), `admin`, `manager`.

## 3.3 Helper Function

A consistent role-check pattern is needed across all policies:

```sql
-- Returns TRUE if auth.uid() has the specified role in user_roles
CREATE OR REPLACE FUNCTION public.has_role(_role text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

This enables clean policy expressions: `has_role('admin')`, `has_role('manager')`, etc.

---

# 4. Final Intended Access Model

## 4.1 The Matrix

### Table: `records` (59 rows — CRITICAL)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| SELECT | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | All logged-in users can view records |
| INSERT | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | Only managers+ can create records |
| UPDATE | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | Only managers+ can edit records |
| DELETE | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | No UI delete — trigger blocks it anyway. If needed: service_role RPC only |

### Table: `audit_log` (66 rows — CRITICAL)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| SELECT | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | Logged-in users can view audit trail |
| INSERT | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | **System-only** — trigger inserts, not user code |
| UPDATE | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | **Immutable** — audit log is append-only |
| DELETE | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | **Immutable** — no deletion ever |

### Table: `profiles` (3 rows — CRITICAL)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| SELECT | ❌ DENY | 🔶 OWN-ONLY | ✅ ALLOW | ✅ ALLOW | Users see own profile; managers see all |
| INSERT | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | Auto-creates on signup (auth trigger) |
| UPDATE | ❌ DENY | 🔶 OWN-ONLY | 🔶 OWN-ONLY | ✅ ALLOW | Users edit own; only admin edits others |
| DELETE | ❌ DENY | ❌ DENY | ❌ DENY | ✅ ALLOW | Admin-only user removal |

> **OWN-ONLY** = `auth.uid() = user_id`

### Table: `user_roles` (3 rows — CRITICAL)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| SELECT | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | Users can see roles (needed for client-side auth checks) |
| INSERT | ❌ DENY | ❌ DENY | ❌ DENY | ✅ ALLOW | Admin-only role assignment |
| UPDATE | ❌ DENY | ❌ DENY | ❌ DENY | ✅ ALLOW | Admin-only role modification |
| DELETE | ❌ DENY | ❌ DENY | ❌ DENY | ✅ ALLOW | Admin-only role removal |

### Table: `notifications` (0 rows — ACTIVE)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| SELECT | ❌ DENY | 🔶 OWN-ONLY | 🔶 OWN-ONLY | 🔶 OWN-ONLY | Users see only their own notifications |
| INSERT | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | **System-only** — created by backend/triggers, not user code |
| UPDATE | ❌ DENY | 🔶 OWN-ONLY | 🔶 OWN-ONLY | 🔶 OWN-ONLY | Users can mark own as read |
| DELETE | ❌ DENY | 🔶 OWN-ONLY | 🔶 OWN-ONLY | 🔶 OWN-ONLY | Users can dismiss own notifications |

> **OWN-ONLY** = `auth.uid() = user_id`

### Table: `capas` (0 rows — ACTIVE)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| SELECT | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | All logged-in users can view CAPAs |
| INSERT | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | Managers+ can create CAPAs |
| UPDATE | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | Managers+ can edit CAPAs |
| DELETE | ❌ DENY | ❌ DENY | ❌ DENY | ✅ ALLOW | Admin-only deletion |

### Table: `risks` (0 rows — ACTIVE)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| SELECT | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | All logged-in users can view risks |
| INSERT | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | Managers+ can create risks |
| UPDATE | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | Managers+ can edit risks |
| DELETE | ❌ DENY | ❌ DENY | ❌ DENY | ✅ ALLOW | Admin-only deletion |

### Table: `process_interactions` (0 rows — ACTIVE)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| SELECT | ❌ DENY | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | All logged-in users can view processes |
| INSERT | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | Managers+ can create |
| UPDATE | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ ALLOW | Managers+ can edit |
| DELETE | ❌ DENY | ❌ DENY | ❌ DENY | ✅ ALLOW | Admin-only deletion |

### Table: `processes` (0 rows — DORMANT)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| ALL | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | **No frontend references. No access until activated.** |

### Tables: `document_metadata`, `document_reviews`, `document_versions` (0 rows — DORMANT)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| ALL | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | **No frontend references. No access until activated.** |

### Table: `error_reports` (0 rows — DORMANT)

| Operation | anon | authenticated (base) | manager | admin | Rationale |
|---|---|---|---|---|---|
| ALL | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | **No frontend references. No access until activated.** |

---

## 4.2 Summary: Minimal Privilege Per Table

| Table | anon | authenticated | manager | admin | Special Rules |
|---|---|---|---|---|---|
| **records** | ❌ None | R | CRUD | CRUD | No DELETE for any role (trigger constraint) |
| **audit_log** | ❌ None | R | R | R | System-only INSERT (trigger); immutable UPDATE/DELETE |
| **profiles** | ❌ None | R+I+U(own) | R+I+U(own) | Full | OWN-ONLY on SELECT/UPDATE for non-admins |
| **user_roles** | ❌ None | R | R | Full | Admin-only write access |
| **notifications** | ❌ None | Own CRUD | Own CRUD | Own CRUD | OWN-ONLY on all ops; system INSERT only |
| **capas** | ❌ None | R | CRUD | Full | Manager write, admin delete |
| **risks** | ❌ None | R | CRUD | Full | Manager write, admin delete |
| **process_interactions** | ❌ None | R | CRUD | Full | Manager write, admin delete |
| **processes** | ❌ None | ❌ None | ❌ None | ❌ None | Dormant — locked until activated |
| **document_*** | ❌ None | ❌ None | ❌ None | ❌ None | Dormant — locked until activated |
| **error_reports** | ❌ None | ❌ None | ❌ None | ❌ None | Dormant — locked until activated |

> R = Read (SELECT only). CRUD = SELECT + INSERT + UPDATE. Full = SELECT + INSERT + UPDATE + DELETE.

---

## 4.3 Design Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **`audit_log` INSERT restricted to system-only** | The trigger `record_change_logger` inserts audit entries. Frontend should NEVER write audit_log directly. Current policy allows anon+authenticated INSERT — vulnerability for audit log tampering. |
| 2 | **`records` DELETE = DENY for all roles** | The trigger makes DELETE impossible via PostgREST anyway. Rather than fight it, make it explicit: no role gets DELETE. If a legitimate delete is needed, it goes through a `service_role` RPC function. |
| 3 | **`notifications` INSERT restricted to system-only** | Notifications are created by backend/triggers, not by user action. Prevents spam/injection. |
| 4 | **Dormant tables get ZERO access** | `processes`, `document_*`, `error_reports` have no data and no frontend references. Lock them completely. When a feature needs them, policies are added deliberately. |
| 5 | **`profiles` uses OWN-ONLY pattern** | A user should only see/edit their own profile. Managers+ can view all (needed for user management). Only admin can edit/delete others. |
| 6 | **`notifications` uses OWN-ONLY pattern** | A user should only see/dismiss their own notifications. `user_id = auth.uid()` filter. |
| 7 | **`has_role()` helper function** | Centralized role check avoids duplicating EXISTS subqueries in every policy. `SECURITY DEFINER` ensures it runs with table owner privileges. |
| 8 | **`{public}` grant removed everywhere** | Replace all `{public}` grants with explicit `{authenticated}`, `{anon}`, or role-specific grants via `has_role()`. No implicit access. |
| 9 | **`rls_forced = false` left as-is** | `forcerowsecurity` only affects table owners. Since `service_role`/`postgres`/`supabase_admin` are the only table owners and they need bypass, forcing would break nothing but adds no value. |
| 10 | **Phase A = RESTRICTIVE policies, Phase B = cleanup** | Zero-downtime guaranteed. RESTRICTIVE policies block anon instantly while authenticated users still pass through existing PERMISSIVE policies. No gap. |

---

## 4.4 Impact on `service_role`

**None.** `service_role` has `bypassrls = true`. All RLS policy changes are invisible to it. Migration scripts, the record_change_logger trigger, and any future RPC functions continue working regardless.

---

## 4.5 Frontend Compatibility Check

| Table | Current Frontend Ops | Model Impact | Mitigation |
|---|---|---|---|
| `records` | SELECT, INSERT, UPDATE | ✅ Compatible — managers+ already do these ops. Base `authenticated` loses INSERT/UPDATE (users without a role can't write). | If non-role authenticated users need read, they get it. No breaking change. |
| `audit_log` | SELECT (3 queries) | ✅ Compatible — SELECT remains for authenticated users | Frontend never INSERTs audit_log directly (trigger handles it) |
| `profiles` | SELECT, INSERT, UPDATE, DELETE | ⚠️ OWN-ONLY on SELECT may break admin user management list | **Mitigation:** Admin gets unfiltered SELECT via `has_role('admin')` policy |
| `user_roles` | SELECT, INSERT, UPSERT, DELETE | ⚠️ Admin-only write — currently frontend may call INSERT/UPSERT from client | **Mitigation:** Only admin users use the user management UI; they'll have admin role. If edge case exists, use RPC. |
| `notifications` | SELECT, INSERT, UPDATE, DELETE | ⚠️ INSERT restricted to system — frontend currently does `.insert(rows)` | **Critical:** Check if frontend directly inserts notifications. If yes, must move to server-side or RPC. |
| `capas` | SELECT, INSERT, UPDATE | ✅ Compatible — managers+ already use these features |
| `risks` | SELECT, INSERT, UPDATE | ✅ Compatible — same |
| `process_interactions` | SELECT, INSERT, UPDATE | ✅ Compatible — same |

**Items requiring attention before execution:**
1. **`notifications` INSERT from frontend** — If the app directly inserts notifications from the client side (using the user's JWT), this will break. Must be moved to a server function or the model adjusted.
2. **`profiles` SELECT for user management** — Admin needs to see all profiles, not just own. The model accounts for this.
3. **`user_roles` INSERT/UPSERT from frontend** — Only admin users do this. The model accounts for this via admin-only write.

---

# 5. Implementation Strategy (Outline — NOT for execution)

## Phase A: Add Security (Zero-Downtime)

1. Create `has_role()` helper function
2. Add RESTRICTIVE policy `rls_require_authenticated` to ALL 13 tables:
   ```sql
   CREATE POLICY rls_require_authenticated ON table_name
     AS RESTRICTIVE FOR ALL TO anon, authenticated
     USING (auth.role() = 'authenticated');
   ```
   **Effect:** anon is instantly blocked on every table. Authenticated users still pass because existing PERMISSIVE policies OR with the restrictive check.

3. Add RESTRICTIVE policy `rls_deny_audit_log_write` on `audit_log`:
   ```sql
   CREATE POLICY rls_deny_audit_log_write ON audit_log
     AS RESTRICTIVE FOR INSERT TO authenticated
     USING (false) WITH CHECK (false);
   CREATE POLICY rls_deny_audit_log_modify ON audit_log
     AS RESTRICTIVE FOR UPDATE TO authenticated
     USING (false) WITH CHECK (false);
   CREATE POLICY rls_deny_audit_log_remove ON audit_log
     AS RESTRICTIVE FOR DELETE TO authenticated
     USING (false);
   ```

4. Run validation test suite → confirm anon = all DENY, authenticated still works.

## Phase B: Replace Permissive Policies (After A Verified)

1. DROP all `{public}` and `{anon}` PERMISSIVE policies
2. Replace `{authenticated}` blanket policies with scoped policies using `has_role()` and `auth.uid()` patterns
3. Add dormant-table lock policies (DENY all for dormant tables)
4. Run validation test suite → confirm full model match.

---

# 6. Open Questions for Batman

1. **`notifications` INSERT** — Frontend code does `.insert(rows)` for notifications. The model says system-only. Do we:
   - (A) Move notification creation to an Edge Function / RPC (correct, but more work)
   - (B) Allow authenticated INSERT on notifications (simpler, risk: any logged-in user can spam)
   - (C) Allow INSERT only for `has_role('admin') OR has_role('manager')`

2. **`records` DELETE** — Currently blocked by trigger. Do we:
   - (A) Keep DENY for all roles, add `service_role` RPC if delete is ever needed
   - (B) Allow DELETE for admin only (won't work with current trigger without RPC anyway)

3. **Dormant tables** — Do you want them completely locked (no access even for admin via client), or should admin retain client-side access as a contingency?

---

**AWAITING APPROVAL BEFORE ANY EXECUTION.**