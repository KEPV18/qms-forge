#!/usr/bin/env python3
"""
QMS Forge — Data Analysis: Inspect file_reviews structure across all records.
Determines exactly what data lives in the legacy schema and what must be migrated.
"""

import json
import os
import urllib.request
import urllib.error
from collections import Counter

SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdXVpa3Rlcm9peG5zcWF6em5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODc2MCwiZXhwIjoyMDkwNDQ0NzYwfQ.JuLDMQIh97T9wwuZEybXfVXn2e145tME81a1eo8khP8"
SUPABASE_URL = "https://iouuikteroixnsqazznc.supabase.co"

headers = {
    "apikey": SERVICE_ROLE,
    "Authorization": f"Bearer {SERVICE_ROLE}",
}

def fetch_all(table: str) -> list:
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=10000"
    req = urllib.request.Request(url, headers=headers)
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())

def main():
    records = fetch_all("records")
    
    real_records = [r for r in records if not r["code"].startswith("RLS-") and not r["code"].startswith("MGR-")]
    test_records = [r for r in records if r["code"].startswith("RLS-") or r["code"].startswith("MGR-")]
    
    print(f"Total: {len(records)} | Real: {len(real_records)} | Test: {len(test_records)}")
    print()
    
    # Analyze legacy columns usage
    print("=" * 70)
    print("LEGACY COLUMN USAGE (36 real records)")
    print("=" * 70)
    
    legacy_cols = ["row_index", "category", "code", "record_name", "description", 
                   "when_to_fill", "template_link", "folder_link", "last_serial",
                   "last_file_date", "days_ago", "next_serial", "audit_status",
                   "reviewed", "reviewed_by", "review_date", "file_reviews",
                   "audit_issues", "record_status", "last_audit_date", "created_at", "updated_at"]
    
    for col in legacy_cols:
        non_null = sum(1 for r in real_records if r.get(col) not in [None, "", [], {}])
        null_count = len(real_records) - non_null
        values = [r.get(col) for r in real_records if r.get(col) not in [None, "", [], {}]]
        sample = str(values[:3])[:100] if values else "ALL NULL"
        print(f"  {col:20s} {non_null:2d}/36 non-null | {sample}")
    
    # Analyze file_reviews structure
    print("\n" + "=" * 70)
    print("FILE_REVIEWS STRUCTURE (per record)")
    print("=" * 70)
    
    all_keys = Counter()
    fr_with_data = 0
    fr_empty = 0
    
    for r in real_records:
        fr = r.get("file_reviews") or {}
        if isinstance(fr, dict) and len(fr) > 0:
            fr_with_data += 1
            for k in fr.keys():
                all_keys[k] += 1
        else:
            fr_empty += 1
    
    print(f"  Records with file_reviews data: {fr_with_data}")
    print(f"  Records with empty/no file_reviews: {fr_empty}")
    print(f"\n  Top file_reviews keys (across {fr_with_data} non-empty records):")
    for k, v in all_keys.most_common(30):
        print(f"    {k:40s} ×{v}")
    
    # Show a sample real record
    print("\n" + "=" * 70)
    print("SAMPLE REAL RECORD (F/43 with data)")
    print("=" * 70)
    for r in real_records:
        if r["code"] == "F/43" and r.get("file_reviews"):
            fr = r["file_reviews"]
            # Filter out Google Drive URLs to show structure only
            structural_keys = [k for k in fr.keys() if not k.startswith(("1", "0", "http"))]
            print(f"  Code: {r['code']}")
            print(f"  Structural keys: {structural_keys[:15]}")
            print(f"  Total keys: {len(fr.keys())}")
            # Show a few non-URL values
            for k in list(fr.keys())[:8]:
                v = fr[k]
                if isinstance(v, str) and len(v) > 80:
                    print(f"    {k}: (truncated) {str(v)[:80]}...")
                else:
                    print(f"    {k}: {v}")
            break
    
    # Check audit_log structure
    print("\n" + "=" * 70)
    print("AUDIT_LOG STRUCTURE")
    print("=" * 70)
    audit = fetch_all("audit_log")
    cols = list(audit[0].keys()) if audit else []
    print(f"  Columns: {cols}")
    if audit:
        actions = Counter(a.get("action") for a in audit)
        print(f"  Actions: {dict(actions)}")
    
    # Profiles
    profiles = fetch_all("profiles")
    print(f"\n  Profiles: {len(profiles)} rows")
    for p in profiles:
        print(f"    {p.get('email', '?')} | role={p.get('role', '?')} | id={p.get('id', '?')[:8]}...")
    
    # User roles
    roles = fetch_all("user_roles")
    print(f"\n  User roles: {len(roles)} rows")
    for r in roles:
        print(f"    user={r.get('user_id', '?')[:8]}... | role={r.get('role', '?')}")

if __name__ == "__main__":
    main()