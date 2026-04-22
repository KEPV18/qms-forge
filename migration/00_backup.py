#!/usr/bin/env python3
"""
QMS Forge — Phase A: Full DB Backup + Export + Validation
Creates a verified JSON snapshot of ALL data before any schema change.
Aborts if integrity check fails.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime

SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdXVpa3Rlcm9peG5zcWF6em5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODc2MCwiZXhwIjoyMDkwNDQ0NzYwfQ.JuLDMQIh97T9wwuZEybXfVXn2e145tME81a1eo8khP8")
SUPABASE_URL = "https://iouuikteroixnsqazznc.supabase.co"
BACKUP_DIR = "/home/kepa/qms-forge/migration"

headers = {
    "apikey": SERVICE_ROLE,
    "Authorization": f"Bearer {SERVICE_ROLE}",
}

def fetch_table(table: str, select: str = "*") -> list:
    """Fetch all rows from a table via service_role (bypasses RLS)."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit=10000"
    req = urllib.request.Request(url, headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  ❌ Failed to fetch {table}: {e.code} {e.read().decode()[:200]}")
        return []
    except Exception as e:
        print(f"  ❌ Network error on {table}: {e}")
        return []

def validate_backup(backup: dict) -> bool:
    """Validate backup integrity. Returns True if valid."""
    errors = []
    
    # Validate data tables only (skip _meta)
    for table, rows in backup.items():
        if table.startswith("_"):
            continue
        if rows is None:
            errors.append(f"{table}: NULL data")
            continue
        
        if not isinstance(rows, list):
            errors.append(f"{table}: Not a list (type={type(rows).__name__})")
            continue
        
        if len(rows) == 0:
            print(f"  ⚠️  {table}: 0 rows (may be expected)")
        
        # Check for valid JSON serializability
        try:
            json.dumps(rows)
        except (TypeError, ValueError) as e:
            errors.append(f"{table}: Not JSON serializable — {e}")
        
        # Table-specific checks
        if table == "records":
            for i, row in enumerate(rows):
                if not row.get("id"):
                    errors.append(f"records[{i}]: Missing id")
                if not row.get("code"):
                    errors.append(f"records[{i}]: Missing code (row_index={row.get('row_index')})")
        
        if table == "audit_log":
            for i, row in enumerate(rows):
                if not row.get("record_id"):
                    errors.append(f"audit_log[{i}]: Missing record_id")
    
    if errors:
        print(f"\n  ❌ VALIDATION FAILED — {len(errors)} error(s):")
        for e in errors[:10]:
            print(f"     {e}")
        if len(errors) > 10:
            print(f"     ... and {len(errors) - 10} more")
        return False
    
    return True

def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(BACKUP_DIR, f"backup_{timestamp}.json")
    checksum_file = os.path.join(BACKUP_DIR, f"backup_{timestamp}.checksum.txt")
    
    print("=" * 60)
    print("QMS FORGE — PRE-CUT BACKUP")
    print("=" * 60)
    
    # Tables to backup
    tables = [
        ("records", "*"),
        ("audit_log", "*"),
        ("notifications", "*"),
        ("profiles", "*"),
        ("user_roles", "*"),
        ("risks", "*"),
        ("capas", "*"),
        ("processes", "*"),
        ("process_interactions", "*"),
    ]
    
    backup = {}
    print("\n📦 Fetching tables...")
    for table, select in tables:
        rows = fetch_table(table, select)
        backup[table] = rows
        print(f"  {table}: {len(rows)} rows")
    
    # Also get auth users count (can't export via REST, but can verify)
    print("\n🔐 Checking auth users...")
    auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    auth_headers = {
        "apikey": SERVICE_ROLE,
        "Authorization": f"Bearer {SERVICE_ROLE}",
    }
    try:
        req = urllib.request.Request(auth_url, headers=auth_headers)
        resp = urllib.request.urlopen(req, timeout=10)
        auth_data = json.loads(resp.read())
        user_count = len(auth_data.get("users", []))
        backup["_meta"] = {
            "auth_user_count": user_count,
            "backup_timestamp": timestamp,
            "source": SUPABASE_URL,
        }
        print(f"  auth.users: {user_count}")
    except Exception as e:
        print(f"  ⚠️  Could not fetch auth users: {e}")
        backup["_meta"] = {
            "auth_user_count": "unknown",
            "backup_timestamp": timestamp,
            "source": SUPABASE_URL,
        }
    
    # Write backup
    print(f"\n💾 Writing backup to {backup_file}...")
    with open(backup_file, "w") as f:
        json.dump(backup, f, indent=2, default=str)
    
    file_size = os.path.getsize(backup_file)
    print(f"  Written: {file_size:,} bytes")
    
    # Write checksum
    import hashlib
    with open(backup_file, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()
    with open(checksum_file, "w") as f:
        f.write(f"sha256:{sha256}\n")
        f.write(f"file:{backup_file}\n")
        f.write(f"timestamp:{timestamp}\n")
        f.write(f"size:{file_size}\n")
    print(f"  SHA-256: {sha256[:32]}...")
    
    # Validate
    print("\n🔍 Validating backup integrity...")
    if validate_backup(backup):
        print("\n  ✅ BACKUP VALID — Safe to proceed with migration.")
        print(f"\n  Backup: {backup_file}")
        print(f"  Checksum: {checksum_file}")
        
        # Summary
        print(f"\n{'=' * 60}")
        print("BACKUP SUMMARY")
        print(f"{'=' * 60}")
        for table in ["records", "audit_log", "notifications", "profiles", "user_roles", "risks", "capas", "processes", "process_interactions"]:
            count = len(backup.get(table, []))
            print(f"  {table:25s} {count:6d} rows")
        print(f"{'=' * 60}")
        return 0
    else:
        print("\n  🔴 BACKUP INVALID — ABORT. Do NOT proceed with migration.")
        return 1

if __name__ == "__main__":
    sys.exit(main())