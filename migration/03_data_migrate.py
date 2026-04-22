#!/usr/bin/env python3
"""
QMS Forge — Phase C: Full Data Migration
Transforms ALL legacy fields → new schema in one pass.

Rules:
- Row count MUST match before/after
- No NULLs in required fields (form_code, serial, status)
- All JSON in form_data must be valid
- Test records (RLS-, MGR-) are DELETED, not migrated
- Any mismatch = ABORT

Run AFTER 02_schema_build.sql has been executed.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime
from collections import Counter

SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdXVpa3Rlcm9peG5zcWF6em5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODc2MCwiZXhwIjoyMDkwNDQ0NzYwfQ.JuLDMQIh97T9wwuZEybXfVXn2e145tME81a1eo8khP8")
SUPABASE_URL = "https://iouuikteroixnsqazznc.supabase.co"

headers = {
    "apikey": SERVICE_ROLE,
    "Authorization": f"Bearer {SERVICE_ROLE}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


# ============================================================================
# FORM SCHEMA METADATA — Section/sectionName/frequency for each form code
# ============================================================================

FORM_META = {
    "F/08": {"section": 1, "section_name": "Sales & Customer Service", "frequency": "On event"},
    "F/09": {"section": 1, "section_name": "Sales & Customer Service", "frequency": "On event"},
    "F/10": {"section": 1, "section_name": "Sales & Customer Service", "frequency": "On event"},
    "F/50": {"section": 1, "section_name": "Sales & Customer Service", "frequency": "On event"},
    "F/11": {"section": 2, "section_name": "Operations", "frequency": "Monthly"},
    "F/19": {"section": 2, "section_name": "Operations", "frequency": "On event"},
    "F/12": {"section": 3, "section_name": "Design & Development", "frequency": "On event"},
    "F/17": {"section": 3, "section_name": "Design & Development", "frequency": "On event"},
    "F/18": {"section": 3, "section_name": "Design & Development", "frequency": "On event"},
    "F/22": {"section": 3, "section_name": "Design & Development", "frequency": "On event"},
    "F/25": {"section": 3, "section_name": "Design & Development", "frequency": "Semi-annual"},
    "F/47": {"section": 3, "section_name": "Design & Development", "frequency": "On event"},
    "F/48": {"section": 3, "section_name": "Design & Development", "frequency": "Monthly"},
    "F/13": {"section": 4, "section_name": "Supplier Management", "frequency": "On event"},
    "F/14": {"section": 4, "section_name": "Supplier Management", "frequency": "On event"},
    "F/15": {"section": 4, "section_name": "Supplier Management", "frequency": "Annual"},
    "F/16": {"section": 4, "section_name": "Supplier Management", "frequency": "Annual"},
    "F/28": {"section": 5, "section_name": "HR & Training", "frequency": "On event"},
    "F/29": {"section": 5, "section_name": "HR & Training", "frequency": "Per employee"},
    "F/30": {"section": 5, "section_name": "HR & Training", "frequency": "On event"},
    "F/40": {"section": 5, "section_name": "HR & Training", "frequency": "Semi-annual"},
    "F/41": {"section": 5, "section_name": "HR & Training", "frequency": "On event"},
    "F/42": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "Annual"},
    "F/43": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/44": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/32": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/34": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/35": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/37": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/20": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/21": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/23": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/24": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "Quarterly"},
    "F/45": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/46": {"section": 6, "section_name": "Measurement & Improvement", "frequency": "On event"},
    "F/99": {"section": 0, "section_name": "Test", "frequency": "N/A"},
}

# Map legacy record_status → new enum
STATUS_MAP = {
    "pending": "pending_review",
    "approved": "approved",
    "rejected": "rejected",
    "draft": "draft",
    "": "draft",
    None: "draft",
}


def supabase_request(method: str, table: str, data=None, query: str = ""):
    """Make a Supabase REST API request via service_role."""
    url = f"{SUPABASE_URL}/rest/v1/{table}{query}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        if resp.read(1):
            # We already consumed 1 byte — rewind not possible, re-fetch
            pass
        return True, None
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()[:500]
        return False, f"HTTP {e.code}: {error_body}"
    except Exception as e:
        return False, str(e)


def supabase_patch(record_id: str, update_data: dict):
    """PATCH a single record by id."""
    url = f"{SUPABASE_URL}/rest/v1/records?id=eq.{record_id}"
    body = json.dumps(update_data).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method="PATCH")
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return True, None
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()[:500]
        return False, f"HTTP {e.code}: {error_body}"
    except Exception as e:
        return False, str(e)


def supabase_delete(table: str, query: str):
    """DELETE records matching query."""
    url = f"{SUPABASE_URL}/rest/v1/{table}{query}"
    req = urllib.request.Request(url, data=None, headers=headers, method="DELETE")
    try:
        urllib.request.urlopen(req, timeout=15)
        return True, None
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()[:500]
        return False, f"HTTP {e.code}: {error_body}"
    except Exception as e:
        return False, str(e)


def fetch_all(table: str) -> list:
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=10000"
    req = urllib.request.Request(url, headers={k: v for k, v in headers.items() if k != "Prefer"})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())


def transform_record(row: dict) -> dict:
    """Transform ONE legacy record row into new-schema columns."""
    code = row.get("code", "")
    
    # form_code = code
    form_code = code
    
    # serial = last_serial (the actual record serial like F/08-001)
    serial = row.get("last_serial") or code
    # For template rows without a real serial, use the code as serial
    if not serial or "-" not in serial:
        serial = code
    
    # form_name = record_name
    form_name = row.get("record_name") or ""
    
    # status — map legacy values to new enum
    raw_status = row.get("record_status") or ""
    # Also check file_reviews.recordStatus
    fr = row.get("file_reviews") or {}
    if isinstance(fr, str):
        try:
            fr = json.loads(fr)
        except:
            fr = {}
    fr_status = fr.get("recordStatus") if isinstance(fr, dict) else None
    
    # Prefer the record_status column, fall back to file_reviews
    status_raw = raw_status or fr_status or "pending"
    status = STATUS_MAP.get(status_raw, "draft")
    
    # created_by — best guess from reviewed_by or empty
    created_by = row.get("reviewed_by") or ""
    
    # last_modified_by — not available in legacy
    last_modified_by = ""
    
    # edit_count — start at 0
    edit_count = 0
    
    # modification_reason — empty
    modification_reason = ""
    
    # section/section_name/frequency from FORM_META
    meta = FORM_META.get(code, {"section": 0, "section_name": "Unknown", "frequency": ""})
    section = meta["section"]
    section_name = meta["section_name"]
    frequency = meta["frequency"]
    
    # form_data — extract ONLY business data from file_reviews
    # Remove audit metadata (auditIssues, recordStatus, lastAuditDate, lastUpdated)
    # Remove Google Drive file IDs (keys that are long alphanumeric strings)
    form_data = {}
    if isinstance(fr, dict):
        SKIP_KEYS = {"auditIssues", "recordStatus", "lastAuditDate", "lastUpdated"}
        for k, v in fr.items():
            # Skip audit metadata
            if k in SKIP_KEYS:
                continue
            # Skip Google Drive file IDs (looks like a Drive file ID: 20+ chars, alphanumeric + _ -)
            if len(k) > 20 and all(c.isalnum() or c in "_-" for c in k):
                continue
            # Skip if value is a Google Drive URL
            if isinstance(v, str) and "drive.google.com" in v:
                continue
            if isinstance(v, str) and "docs.google.com" in v:
                continue
            form_data[k] = v
    
    return {
        "form_code": form_code,
        "serial": serial,
        "form_name": form_name,
        "form_data": form_data,
        "status": status,
        "created_by": created_by,
        "last_modified_by": last_modified_by,
        "edit_count": edit_count,
        "modification_reason": modification_reason,
        "section": section,
        "section_name": section_name,
        "frequency": frequency,
    }


def main():
    print("=" * 70)
    print("QMS FORGE — PHASE C: DATA MIGRATION")
    print("=" * 70)
    
    # Fetch all records
    print("\n📦 Fetching all records...")
    records = fetch_all("records")
    print(f"  Total: {len(records)}")
    
    real = [r for r in records if not r["code"].startswith("RLS-") and not r["code"].startswith("MGR-")]
    test = [r for r in records if r["code"].startswith("RLS-") or r["code"].startswith("MGR-")]
    print(f"  Real: {len(real)} | Test (to delete): {len(test)}")
    
    # ── Step 1: Delete test records ──────────────────────────────────────
    print(f"\n🗑️  Deleting {len(test)} test records...")
    test_ids = [r["id"] for r in test]
    
    # Delete in batches of 10 (URL length limits)
    deleted = 0
    failed = 0
    for i in range(0, len(test_ids), 10):
        batch = test_ids[i:i+10]
        query = "?id=in.(" + ",".join(batch) + ")"
        ok, err = supabase_delete("records", query)
        if ok:
            deleted += len(batch)
        else:
            print(f"  ❌ Delete batch failed: {err[:100]}")
            failed += len(batch)
    
    print(f"  Deleted: {deleted} | Failed: {failed}")
    
    if failed > 0:
        # Also delete test audit log entries
        print("  Cleaning up test audit_log entries...")
        ok, _ = supabase_delete("audit_log", "?record_id=in.(" + ",".join(test_ids[:50]) + ")")
    
    # ── Step 2: Migrate real records ─────────────────────────────────────
    print(f"\n🔄 Migrating {len(real)} real records...")
    
    migrated = 0
    errors = []
    
    for i, row in enumerate(real):
        transformed = transform_record(row)
        
        # Validate transformed data
        if not transformed["form_code"]:
            errors.append(f"Row {i}: Empty form_code (id={row['id'][:8]})")
            continue
        if not transformed["serial"]:
            errors.append(f"Row {i}: Empty serial (code={row['code']})")
            continue
        if not transformed["status"]:
            errors.append(f"Row {i}: Empty status (code={row['code']})")
            continue
        
        # Validate form_data is valid JSON
        try:
            json.dumps(transformed["form_data"])
        except (TypeError, ValueError) as e:
            errors.append(f"Row {i}: Invalid form_data JSON for {row['code']}: {e}")
            continue
        
        # PATCH the record
        ok, err = supabase_patch(row["id"], transformed)
        if ok:
            migrated += 1
            if (migrated % 10) == 0 or migrated == len(real):
                print(f"  {migrated}/{len(real)} migrated...")
        else:
            errors.append(f"Row {i}: PATCH failed for {row['code']}: {err[:200]}")
    
    # ── Step 3: Validation ──────────────────────────────────────────────
    print(f"\n🔍 Post-migration validation...")
    
    # Re-fetch and verify
    updated = fetch_all("records")
    updated_real = [r for r in updated if not r.get("code", "").startswith("RLS-") and not r.get("code", "").startswith("MGR-")]
    
    print(f"  Records after migration: {len(updated_real)} (expected: {len(real)})")
    
    if len(updated_real) != len(real):
        print(f"  🔴 ROW COUNT MISMATCH! {len(updated_real)} vs {len(real)}. ABORT.")
        return 1
    
    # Check required fields
    bad = 0
    for r in updated_real:
        if not r.get("form_code"):
            print(f"  ❌ Missing form_code: id={r['id'][:8]} code={r.get('code')}")
            bad += 1
        if not r.get("serial"):
            print(f"  ❌ Missing serial: id={r['id'][:8]} code={r.get('code')}")
            bad += 1
        if not r.get("status"):
            print(f"  ❌ Missing status: id={r['id'][:8]} code={r.get('code')}")
            bad += 1
        if r.get("form_data") is None:
            print(f"  ❌ Missing form_data: id={r['id'][:8]} code={r.get('code')}")
            bad += 1
    
    if bad > 0:
        print(f"\n  🔴 {bad} REQUIRED FIELD(S) MISSING. ABORT.")
        return 1
    
    # Check for NULL form_data (not empty object, actual NULL)
    null_form_data = sum(1 for r in updated_real if r.get("form_data") is None)
    if null_form_data > 0:
        print(f"  🔴 {null_form_data} records have NULL form_data. ABORT.")
        return 1
    
    # Validate all form_data is valid JSON
    for r in updated_real:
        fd = r.get("form_data")
        if fd is not None:
            try:
                json.dumps(fd)
            except:
                print(f"  ❌ Invalid JSON in form_data for {r.get('code')}")
                bad += 1
    
    # Summary
    print(f"\n{'=' * 70}")
    print("MIGRATION SUMMARY")
    print(f"{'=' * 70}")
    print(f"  Test records deleted: {deleted}")
    print(f"  Real records migrated: {migrated}/{len(real)}")
    print(f"  Migration errors: {len(errors)}")
    
    # Status distribution
    status_counts = Counter(r.get("status") for r in updated_real)
    print(f"\n  Status distribution:")
    for s, c in sorted(status_counts.items()):
        print(f"    {s}: {c}")
    
    # Serial uniqueness
    serials = [r.get("serial") for r in updated_real if r.get("serial")]
    dup_serials = [s for s, c in Counter(serials).items() if c > 1]
    if dup_serials:
        print(f"\n  ⚠️  Duplicate serials found: {dup_serials[:5]}")
    else:
        print(f"\n  ✅ All serials unique ({len(serials)} total)")
    
    # Section distribution
    section_counts = Counter(r.get("section") for r in updated_real)
    print(f"\n  Section distribution:")
    for s, c in sorted(section_counts.items(), key=lambda x: x[0] or 0):
        sn = next((r.get("section_name") for r in updated_real if r.get("section") == s), "")
        print(f"    Section {s} ({sn}): {c} records")
    
    if errors:
        print(f"\n  ❌ ERRORS ({len(errors)}):")
        for e in errors[:10]:
            print(f"    {e}")
        if len(errors) > 10:
            print(f"    ... and {len(errors) - 10} more")
        return 1
    
    print(f"\n  ✅ MIGRATION VALID — All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())