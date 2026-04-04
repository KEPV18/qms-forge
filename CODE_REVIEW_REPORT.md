# QMS Codebase Review — April 4, 2026

**Analyzed:** `src/components/`, `src/lib/`, `src/pages/` (~22,000 LOC, 124 files)

---

## 🔴 Critical Issues

### 1. Broken Hook — Runtime Crash
**File:** `src/lib/validation.ts:106-140`

`useFormValidation` uses React hooks (`useState`, `useCallback`) but **never imports React**. This will cause a runtime error.

```typescript
// Line 106-140 - Missing React import!
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  rules: ValidationRules<T>
) {
  const [values, setValues] = useState<T>(initialValues);  // ReferenceError!
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  // ...
}
```

**Fix:** Add `import React from 'react'` at the top of the file.

---

### 2. Hardcoded Spreadsheet ID
**Files:**
- `src/lib/capaRegisterService.ts:13` 
- `src/lib/riskRegisterService.ts:13`

```typescript
const SPREADSHEET_ID = "11dGB-fG2UMqsdqc182PsY-K6S_19FKc8bsZLHlic18M";
```

**Issue:** Hardcoded spreadsheet ID — should use `import.meta.env.VITE_SPREADSHEET_ID` like `googleSheets.ts` does.

---

### 3. Empty Catch Block (Silent Failures)
**File:** `src/lib/driveService.ts:383`

```typescript
} catch (error) { 
  // Error logged
  return "Unknown";
}
```

**Issue:** Errors are swallowed silently — users don't know when operations fail.

---

## 🟠 Code Quality Issues

### 4. Missing useEffect Dependencies
| File | Line | Missing |
|------|------|---------|
| `src/components/layout/Sidebar.tsx` | 83 | `expandedItems` |
| `src/components/records/RecordBrowser.tsx` | 85 | `files.length`, `loadFiles` |
| `src/pages/ArchivePage.tsx` | 58 | `loadArchivedFiles`, `toast` |

**Impact:** Stale closures, incorrect data rendering.

---

### 5. Unused Expressions (Lint Errors)
- `src/pages/AdminAccounts.tsx:163` — Expression statement does nothing
- `src/pages/ArchivePage.tsx:99` — Same issue

---

### 6. Duplicate ErrorBoundary Components
- `src/components/error/ErrorBoundary.tsx`
- `src/components/ui/error-boundary.tsx`

Two nearly identical components exist. Consolidate into one.

---

## 🟡 Performance Issues

### 7. Sequential Bulk API Calls
**File:** `src/lib/statusService.ts:186-227`

`bulkApproveRecords` and `bulkRejectRecords` process records sequentially with `await` in a loop. Each triggers a separate Sheets API request.

**Fix:** Use `Promise.all()` or batch update API.

---

### 8. Missing Memoization
Large components like `AuditPage.tsx` (~670 lines) lack memoization for computed values:
- `handleBulkStatusChange` could use `useCallback`
- `moduleStats`, `auditSummary` recalculate on every render

---

## 🟢 Summary

| Category | Count |
|----------|-------|
| Critical (runtime crash) | 1 |
| High (security/hardcoded) | 2 |
| Medium (React hooks, bugs) | 5 |
| Performance | 2 |

**Priority:** Fix the broken `useFormValidation` hook immediately — it will crash at runtime.