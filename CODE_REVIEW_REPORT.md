# QMS Code Review Report — April 18, 2026

## Summary
Reviewed: `src/components/`, `src/lib/`, `src/pages/`
TypeScript compiles cleanly. ESLint reports 9 warnings (all fast-refresh related, no errors).

---

## 1. Code Quality Issues & Anti-Patterns

### Large Components (potential maintainability issues)
- **src/pages/AuditPage.tsx** (728 lines) — Consider splitting into smaller subcomponents
- **src/components/risk/RiskRegisterTab.tsx** (708 lines)
- **src/components/audit/AutomatedAuditModal.tsx** (796 lines)
- **src/lib/googleSheets.ts** (704 lines) — Service file approaching 1000 lines; could be split by domain (records vs. metadata vs. cache)

### Unused/Duplicated Logic
- `src/components/records/AddRecordModal.tsx:38` + `src/components/records/EditMetadataModal.tsx:58` both define `selectedProject` default: `"General / All Company"` — extract to shared constant

### Magic Strings
- **Project name normalization** repeated 5+ times across files:
  - `src/pages/AuditPage.tsx:330`
  - `src/pages/ProjectDetailPage.tsx:58,73`
  - `src/pages/ProjectsPage.tsx:61`
  - `src/components/layout/Sidebar.tsx:71`
  
  Create utility: `normalizeProjectName(project: string): string`

### Hardcoded "General / All Company" appears in 7+ files
Consider centralizing in a constants file (e.g., `src/lib/constants.ts`)

---

## 2. Performance Improvements

### Missing `useMemo` / `useCallback`
- **src/pages/AuditPage.tsx** — `filteredRecords` computed inside render without memoization (line 276+). Large record sets will recalculate on every render.
- **src/components/records/RecordCard.tsx** — `formatDate` and similar utils called inline; wrap in `useMemo` for list renders.

### Large File Rendering
- **src/components/records/RecordBrowser.tsx** (428 lines) — Pagination logic could be extracted to a custom hook to reduce component size.
- **src/components/dashboard/QuickActions.tsx** (462 lines) — Action definitions defined inside component; extract to outside component or a config object.

### Potential Memory Leaks
- **src/lib/auth.ts:1-2** — Global `cachedAccessToken` and `tokenExpiry` never expire unless manually cleared. Consider adding `logout()` function to reset these.

---

## 3. Security Issues

### No Critical Issues Found
- Auth flows use HTTP-only patterns (via `/api/token` proxy)
- No sensitive data exposed in client-side code

### Minor Observations
- **src/lib/auth.ts:14-21** — Error messages leak internal paths (`RUN_LOCAL.bat`). Consider generic "Authentication unavailable" message.
- No CSRF protection visible on form submissions; verify backend handles this.

---

## 4. Missing Error Handling

### Partial Error Handling (acceptable but incomplete)
- **src/lib/driveService.ts:390** — `catch (e)` silently swallows error; should log or return meaningful fallback.
- **src/lib/auditCheckService.ts:352** — catches `unknown` but doesn't distinguish between network vs. permission errors.

### Async/Await Without Try-Catch
- **src/pages/AuditPage.tsx:89** — `handleBulkStatusChange` performs async work but doesn't show user-facing error toasts on failure.

### Empty States
- **src/components/ui/EmptyState.tsx** exists but many list components don't use it — records list, risk register, CAPA tabs could benefit from explicit empty states.

---

## 5. Unused Imports / Dead Code

### ESLint-detected (9 warnings, 0 errors)
All warnings are `react-refresh/only-export-components` — shadcn/ui files exporting constants alongside components. Not critical but clutters lint output.

### Potential Dead Code
- **src/hooks/useManualData.ts** — imported but verify usage
- **src/hooks/useProcessData.ts** — imported but verify usage
- **src/hooks/useQMSData.ts** — imported but verify usage

Run: `grep -r "useManualData\|useProcessData\|useQMSData" src/` to confirm actual usage.

### Duplicate Imports
- **src/lib/utils.ts** exports `cn` (classnames utility) but many files import from `@/lib/utils` — verify all usage points to same file.

---

## Recommendations Priority

| Priority | Issue | Location |
|----------|-------|----------|
| 🔴 High | Extract magic string `"General / All Company"` to constants | 7+ files |
| 🟠 Medium | Add `useMemo` for filtered records | AuditPage.tsx:276 |
| 🟠 Medium | Create `normalizeProjectName()` utility | repeated 5+ times |
| 🟡 Low | Add error toast to `handleBulkStatusChange` | AuditPage.tsx:89 |
| 🟡 Low | Add `logout()` to clear auth cache | auth.ts |
| 🟡 Low | Split large services (googleSheets.ts, driveService.ts) | src/lib/ |

---

*Review performed statically; runtime behavior may differ.*