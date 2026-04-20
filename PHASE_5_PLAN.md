# Phase 5 — Record View & Edit

**Status:** Planning  
**Blocked by:** Schema Freeze (v0.3-alpha)  
**Architecture:** Google Sheets = dumb storage. All validation, serial, integrity in app layer.

---

## Requirements

### 5.1 — Record View (Read-Only Default)

- All records display in **read-only mode** by default.
- No edit button visible unless user has edit permissions.
- Record data shown in a clean, sectioned layout (not raw JSON).
- Dates displayed in DD/MM/YYYY format.
- Serial numbers displayed as F/XX-NNN.
- Tables rendered as proper HTML tables (not raw arrays).

### 5.2 — Record Edit (Controlled + Tracked)

- Edit button appears only for authorized users.
- On edit, fields become editable (same DynamicFormRenderer in edit mode).
- **Last modified tracking**: Every edit records:
  - `_lastModifiedAt`: ISO timestamp
  - `_lastModifiedBy`: user email or name
  - `_editCount`: incremented integer
- Edit history is NOT a full audit trail (Phase 7), but must track:
  - Who made the change
  - When
  - Which record
- Edits go through the same Zod validation pipeline as creation.
- Pre-Creation Gate does NOT appear on edit (only on creation).

### 5.3 — Storage Architecture

**Google Sheets = Dumb Storage:**
- One sheet per form code (e.g., `F_12` for F/12)
- Each row = one record
- Each column = one field
- No formulas, no validation in Sheets
- No computed columns in Sheets
- Application layer handles ALL validation, serial generation, integrity

**Sheet Structure:**
```
| _serial | _createdAt | _createdBy | _lastModifiedAt | _lastModifiedBy | _editCount | date | project_name | nc_type | description | ... |
```

- System columns prefixed with `_`
- Data columns match Zod schema field names
- Serial column is the primary key

### 5.4 — Record List Page

- `/records` route shows all records from all sheets
- Filterable by form code, date range, status
- Searchable by serial number or content
- Clicking a record opens read-only view
- Edit button available per record (if authorized)

### 5.5 — Data Integrity (App-Layer Only)

- Serial numbers: checked against Sheets before creation (prevent duplicates)
- References: F/12 references F/22 corrective actions (cross-form validation deferred to Phase 7)
- No orphan records: delete not allowed, only archive

---

## Implementation Order

1. Create `RecordViewPage.tsx` — read-only display
2. Add edit toggle logic to `DynamicFormRenderer.tsx` — `readOnly` prop
3. Create `RecordListPage.tsx` — list + filter + search
4. Build Google Sheets read service — `sheetsService.ts`
5. Wire view pages to Sheets data
6. Add edit tracking (last modified, edit count)
7. Build Google Sheets write service — create + update records
8. Test all 35 forms end-to-end

---

*Phase 5 is about stability, not new features. View first, edit second, store third.*