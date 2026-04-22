# QMS Forge — Security Baseline Reference

**Version:** v2.0.2-rls-verified  
**Date:** 2026-04-22  
**Commit:** `4aa65e9`  
**Verified:** 22/22 deterministic stress test pass (x2 consecutive)

---

## 1. RLS Policy Model

### Access Control Principles

| Rule | Detail |
|---|---|
| **Anon = nothing** | Every table has `rls_block_anon` RESTRICTIVE policy (`qual: false`) for `{anon}` role |
| **Hard DELETE = nobody** | `rls_deny_records_delete` RESTRICTIVE (`qual: false`) blocks DELETE for all authenticated users on `records` |
| **Role-gated writes** | INSERT/UPDATE on core tables require `user_roles.role IN ('admin', 'manager')` |
| **Audit log = immutable** | RESTRICTIVE policies block INSERT/UPDATE/DELETE for authenticated users; only `log_record_change` trigger (SECURITY DEFINER) can write |
| **Notifications = user-scoped** | Users can only UPDATE/DELETE their own notifications (`user_id = auth.uid()`) |
| **service_role = god mode** | Bypasses ALL RLS. Never use for client-side operations. Only for DBA/migration scripts. |

### User Roles

| User ID | Email | Role | Access Level |
|---|---|---|---|
| `c634003e-7507-4315-8f73-bc2bb96c4673` | ibnkhaled16@gmail.com | admin | Full CRUD on all gated tables |
| `a90d6520-d6d3-4f89-8624-0e35bb33bb32` | akh.dev185@gmail.com | manager | Full CRUD on all gated tables |
| `eabcebc3-34c1-4d1b-bcd2-7ba5edfc50ae` | vezlooteam@gmail.com | manager | Full CRUD on all gated tables |

---

## 2. Table-by-Table RLS

### `records` (core data) — 5 policies

| Policy | Type | Command | Role | Condition |
|---|---|---|---|---|
| `rls_block_anon` | RESTRICTIVE | ALL | anon | `false` |
| `rls_deny_records_delete` | RESTRICTIVE | DELETE | authenticated | `false` |
| `Admin and manager can insert records` | PERMISSIVE | INSERT | authenticated | `EXISTS (user_roles WHERE uid=auth.uid() AND role IN ('admin','manager'))` |
| `Admin and manager can update records` | PERMISSIVE | UPDATE | authenticated | Same as INSERT (USING + WITH CHECK) |
| `Authenticated users can read records` | PERMISSIVE | SELECT | authenticated | `true` |
| `records_read` | PERMISSIVE | SELECT | authenticated | `true` (duplicate, harmless) |

**Effective access:**
- anon: ❌ nothing
- authenticated (no role): READ only
- admin/manager: READ + INSERT + UPDATE (no DELETE)
- Hard DELETE: ❌ nobody (use `soft_delete_record` RPC)
- Soft delete: via UPDATE (`deleted_at` column), same role gate as UPDATE

### `audit_log` (immutable audit trail) — 5 policies

| Policy | Type | Command | Role | Condition |
|---|---|---|---|---|
| `rls_block_anon` | RESTRICTIVE | ALL | anon | `false` |
| `rls_deny_audit_insert` | RESTRICTIVE | INSERT | authenticated | `false` (with_check) |
| `rls_deny_audit_update` | RESTRICTIVE | UPDATE | authenticated | `false` |
| `rls_deny_audit_delete` | RESTRICTIVE | DELETE | authenticated | `false` |
| `audit_log_read` | PERMISSIVE | SELECT | authenticated | `true` |

**Effective access:**
- anon: ❌ nothing
- authenticated: READ only
- All writes: ❌ blocked (trigger `log_record_change` writes via SECURITY DEFINER)

### `notifications` (user-scoped) — 5 policies

| Policy | Type | Command | Role | Condition |
|---|---|---|---|---|
| `rls_block_anon` | RESTRICTIVE | ALL | anon | `false` |
| `rls_deny_notifications_insert` | RESTRICTIVE | INSERT | authenticated | `false` (with_check) |
| `notifications_select` | PERMISSIVE | SELECT | authenticated | `user_id = auth.uid()` |
| `notifications_update` | PERMISSIVE | UPDATE | authenticated | `user_id = auth.uid()` |
| `notifications_delete` | PERMISSIVE | DELETE | authenticated | `user_id = auth.uid()` |

**Effective access:**
- anon: ❌ nothing
- authenticated: CRUD on own notifications only
- Cross-user: ❌ blocked (0 rows affected)

### `user_roles` (authorization) — 2 policies

| Policy | Type | Command | Role | Condition |
|---|---|---|---|---|
| `rls_block_anon` | RESTRICTIVE | ALL | anon | `false` |
| `user_roles_read` | PERMISSIVE | SELECT | authenticated | `true` |

**Effective access:**
- anon: ❌ nothing
- authenticated: READ only (no INSERT/UPDATE/DELETE possible)

### `profiles` (user metadata) — 1 policy

| Policy | Type | Command | Role | Condition |
|---|---|---|---|---|
| `rls_block_anon` | RESTRICTIVE | ALL | anon | `false` |

**Effective access:**
- anon: ❌ nothing
- authenticated: unrestricted (no PERMISSIVE policy defined = default deny for write, but SELECT is open due to missing restrictive)
- ⚠️ **Gap:** No explicit SELECT/INSERT/UPDATE/DELETE policies for authenticated. RLS enabled but no permissive policy = total block for authenticated. Need to verify if this is intentional or an oversight.

### Secondary tables

| Table | Anon | Authenticated READ | Authenticated WRITE | Pattern |
|---|---|---|---|---|
| `capas` | ❌ | ✅ | ❌ | Read-only for authenticated |
| `risks` | ❌ | ✅ | ❌ | Read-only for authenticated |
| `process_interactions` | ❌ | ✅ | ❌ | Read-only for authenticated |
| `processes` | ❌ | ❌ | ❌ | Fully locked (rls_lock_all for anon+auth) |
| `document_metadata` | ❌ | ✅ | admin/manager only | Role-gated via user_roles |
| `document_reviews` | ❌ | ✅ | admin/manager only | Role-gated via user_roles |
| `document_versions` | ❌ | ✅ | admin/manager only | Role-gated via user_roles |
| `error_reports` | ❌ | ✅ (SELECT) | ✅ (INSERT public, UPDATE public) | ⚠️ Loosely gated — `Allow insert/update for all` on `{public}` |
| `retention_summary` | ❌ | ? | ? | Need to verify |

---

## 3. RPC Surface (SECURITY DEFINER Functions)

These functions run as `postgres` (bypasses RLS). They are the **only authorized write path** for protected tables.

| Function | Signature | Returns | Purpose | Risk |
|---|---|---|---|---|
| `append_audit_log` | `(p_record_id uuid, p_action text, p_changed_fields jsonb, p_previous_values jsonb, p_new_values jsonb, p_performed_by text, p_form_code text, p_serial text)` | uuid | Write audit log entries (called by trigger + manually) | Low — called by trigger, data is system-generated |
| `soft_delete_record` | `(p_record_id uuid)` | boolean | Soft-delete a record (sets deleted_at) | Medium — any authenticated user could call via REST; should add role check |
| `create_notification` | 3 overloads (see DB sigs) | uuid/jsonb | Create notification for a user | Low — just notification insertion |
| `create_notifications_batch` | 3 overloads | integer/jsonb | Batch create notifications | Low — just notification insertion |
| `get_record_by_serial` | `(p_serial text)` | SETOF records | Fetch record by serial | Low — read-only |
| `get_next_serial` | `(p_form_code text)` | text | Atomically generate next serial | Medium — increments serial counter, could be abused |
| `has_role` | `(required_role text)` | boolean | Check if current user has a role | Low — read-only check |
| `handle_new_user` | `()` | trigger | Auto-create profile on signup | Low — trigger only |
| `log_record_change` | `()` | trigger | Auto-log record changes | Low — trigger only (SECURITY DEFINER so it can write audit_log) |

### Triggers

| Trigger | Table | Function | Purpose |
|---|---|---|---|
| `trigger_log_record_change` | records | `log_record_change` | Auto-audit on INSERT/UPDATE/DELETE |
| `trigger_prevent_audit_update` | audit_log | `prevent_audit_modification` | Block UPDATE on audit_log |
| `trigger_prevent_audit_delete` | audit_log | `prevent_audit_modification` | Block DELETE on audit_log |
| `set_updated_at` | records | `handle_updated_at` | Auto-set `updated_at` on UPDATE |
| `on_auth_user_created` | auth.users | `handle_new_user` | Auto-create profile on signup |

---

## 4. Known Security Gap Inventory

| ID | Gap | Severity | Context | Status |
|---|---|---|---|---|
| G-1 | `error_reports` allows INSERT/UPDATE from `{public}` role | ⚠️ Medium | Any unauthenticated request can write error reports | Documented, not yet fixed |
| G-2 | `profiles` has no permissive policies for authenticated users | ⚠️ Low | May block legitimate profile reads/writes; or works via direct Supabase Auth integration | Needs verification |
| G-3 | `soft_delete_record` RPC has no role check | ⚠️ Medium | Any authenticated user can soft-delete any record by calling RPC directly | Documented, not yet fixed |
| G-4 | `get_next_serial` RPC has no role check | ⚠️ Low | Any authenticated user can increment serial counter | Documented, not yet fixed |
| G-5 | `records_read` is a duplicate SELECT policy | ℹ️ None | Harmless but should be cleaned up | Cleanup target |
| G-6 | Client-side role checks only (UI guards) | ⚠️ Medium | `RequireRole` component only blocks UI; API calls bypass it. Mitigated by RLS on core tables. | Partially mitigated |

---

## 5. Stress Test Verification

**Script:** `migration/stress_test_v3.py`  
**Method:** 22 tests using real `authenticated` (admin, manager) and `anon` tokens. Uses `Prefer: return=representation` header to verify affected rows (not just HTTP status). Unique millisecond-timestamp serials prevent collisions.

| Category | Tests | Result |
|---|---|---|
| RLS enforcement | 8 | ✅ All pass |
| Audit log immutability | 3 | ✅ All pass |
| DB constraints | 6 | ✅ All pass |
| Notification access control | 2 | ✅ All pass |
| Burst writes | 1 | ✅ 20/20 |
| Data integrity | 1 | ✅ F/11-001 untouched |
| **Total** | **22** | **22/22 ✅** |

**Note:** `service_role` key must NEVER be used in stress tests — it bypasses all RLS and gives false negatives.

---

## 6. Change History

| Version | Date | What Changed |
|---|---|---|
| v2.0.0-cutover | 2026-04-22 | Legacy schema destroyed, 16-column new schema only |
| v2.0.1-stabilization | 2026-04-22 | Logger, RLS hardening Phase 1-4, data integrity guards |
| v2.0.2-rls-verified | 2026-04-22 | Deterministic stress test, RLS policy verification, this document |

---

*This document serves as the security baseline. Any future RLS changes must reference this document and update it accordingly.*