#!/usr/bin/env python3
"""
QMS FORGE — CUTOVER ORCHESTRATOR
Executes the entire migration in strict sequence.
Aborts on any failure. No partial state.

Usage:
  python3 99_cutover.py --phase=A     # Backup only
  python3 99_cutover.py --phase=B     # Schema build SQL only
  python3 99_cutover.py --phase=C     # Data migration only
  python3 99_cutover.py --phase=D     # Infrastructure SQL only
  python3 99_cutover.py --phase=E     # Cutover constraints SQL only
  python3 99_cutover.py --phase=F     # Validation only
  python3 99_cutover.py --phase=G     # Legacy destruction SQL only
  python3 99_cutover.py --full        # Execute ALL phases in sequence
"""

import subprocess
import sys
import os

DIR = os.path.dirname(os.path.abspath(__file__))


def run_python(script: str, label: str) -> bool:
    print(f"\n{'=' * 70}")
    print(f"▶ {label}")
    print(f"{'=' * 70}")
    result = subprocess.run([sys.executable, os.path.join(DIR, script)], cwd=DIR)
    if result.returncode != 0:
        print(f"\n🔴 {label} FAILED — Abort.")
        return False
    print(f"✅ {label} PASSED")
    return True


def run_sql(sql_file: str, label: str) -> bool:
    """Remind operator to run SQL manually (Supabase SQL Editor)."""
    print(f"\n{'=' * 70}")
    print(f"▶ {label}")
    print(f"{'=' * 70}")
    path = os.path.join(DIR, sql_file)
    size = os.path.getsize(path)
    print(f"\n  📄 SQL file: {sql_file} ({size:,} bytes)")
    print(f"  📍 Full path: {path}")
    print(f"\n  ⚠️  Execute this SQL in the Supabase SQL Editor:")
    print(f"  https://supabase.com/dashboard/project/iouuikteroixnsqazznc/sql")
    print(f"\n  After execution, type 'done' to continue or 'abort' to stop.")
    
    response = input("\n  > ").strip().lower()
    if response != "done":
        print(f"\n🔴 {label} ABORTED by operator.")
        return False
    
    print(f"✅ {label} — SQL executed (operator confirmed)")
    return True


def main():
    import argparse
    parser = argparse.ArgumentParser(description="QMS Forge Cutover Orchestrator")
    parser.add_argument("--phase", choices=["A","B","C","D","E","F","G"], help="Run single phase")
    parser.add_argument("--full", action="store_true", help="Run all phases in sequence")
    args = parser.parse_args()
    
    if not args.phase and not args.full:
        parser.print_help()
        print("\nSpecify --phase=X or --full")
        return 1
    
    phases = {
        "A": ("00_backup.py", "python", "Phase A — Pre-Cut Safety (Backup)"),
        "B": ("02_schema_build.sql", "sql", "Phase B — Build New Schema"),
        "C": ("03_data_migrate.py", "python", "Phase C — Data Migration"),
        "D": ("04_infrastructure.sql", "sql", "Phase D — Infrastructure (RPCs + Triggers)"),
        "E": ("05_cutover.sql", "sql", "Phase E — Hard Cutover (Constraints)"),
        "F": ("06_validate.py", "python", "Phase F — Validation"),
        "G": ("07_legacy_destruction.sql", "sql", "Phase G — Legacy Destruction"),
    }
    
    if args.phase:
        phase = args.phase
        script, kind, label = phases[phase]
        if kind == "python":
            ok = run_python(script, label)
        else:
            ok = run_sql(script, label)
        return 0 if ok else 1
    
    if args.full:
        print("=" * 70)
        print("QMS FORGE — FULL CUTOVER EXECUTION")
        print("Strict sequence. Abort on any failure. No partial state.")
        print("=" * 70)
        
        confirmed = input("\n⚠️  Confirm FULL cutover execution? (yes/no): ").strip().lower()
        if confirmed != "yes":
            print("Aborted.")
            return 1
        
        for phase, (script, kind, label) in phases.items():
            if kind == "python":
                ok = run_python(script, label)
            else:
                ok = run_sql(script, label)
            
            if not ok:
                print(f"\n🔴 CUTOVER FAILED AT {label}")
                print(f"   Fix the issue and re-run from Phase {phase}.")
                return 1
        
        print(f"\n{'=' * 70}")
        print(f"🎉 CUTOVER COMPLETE — All 7 phases executed successfully.")
        print(f"{'=' * 70}")
        print(f"\n  Next steps:")
        print(f"  1. Deploy frontend (recordStorage_new.ts → recordStorage.ts)")
        print(f"  2. Update Supabase types (supabase gen types)")
        print(f"  3. Run full browser test")
        print(f"  4. Tag release: git tag v2.0.0-cutover")
        return 0


if __name__ == "__main__":
    sys.exit(main())