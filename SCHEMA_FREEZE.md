# Schema Freeze — v0.3-alpha

**Effective:** 2026-04-20  
**Tag:** `v0.3-alpha`  
**Status:** FROZEN — no structural changes unless absolutely necessary

---

## What This Means

- All 35 form schemas in `src/schemas/formValidation.ts` are **frozen**.
- All 35 UI schemas in `src/data/formSchemas.ts` are **frozen**.
- Serial format `F/XX-NNN` is **frozen**.
- Date format `DD/MM/YYYY` (stored) / `YYYY-MM-DD` (input) is **frozen**.
- Pre-Creation Gate (3 questions) is **frozen**.
- Enum values (NC_SEVERITY, CA_STATUS, MONTH, SATISFACTION_LEVELS, etc.) are **frozen**.

## Exceptions

A structural change is "absolutely necessary" only if:
1. An ISO 9001 auditor requires a field that doesn't exist.
2. A field causes data corruption or loss (bug, not enhancement).
3. Batman explicitly overrides the freeze.

Any unfreezing must be documented here with: date, reason, Batman approval.

## Frozen Artifacts

| File | Lines | Content | Status |
|---|---|---|---|
| `src/schemas/formValidation.ts` | ~720 | 35 Zod schemas, shared validators | FROZEN |
| `src/schemas/serialAndDate.ts` | ~200 | Serial gen, date utils, gate logic | FROZEN |
| `src/schemas/index.ts` | ~50 | Central exports | FROZEN |
| `src/data/formSchemas.ts` | ~1200 | 35 UI schemas | FROZEN |

## Test Baseline

- **67/67 tests pass** at time of freeze
- All 35 forms reject empty data
- All enums enforced (no free text where enum defined)
- DD/MM/YYYY conversion round-trips correct
- Serial numbers auto-generate and detect duplicates
- Pre-Creation Gate enforces 3 questions with min character counts

---

*Schema Freeze active. Robin enforces this.*