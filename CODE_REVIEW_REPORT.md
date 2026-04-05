# QMS Codebase Review Report

**Date:** April 5, 2026  
**Reviewer:** Kilo ⚡  
**Scope:** `src/components/`, `src/lib/`, `src/pages/`

---

## 1. Code Quality Issues & Anti-Patterns

### 1.1 Excessive Use of `any` Type
- **src/components/records/RecordCard.tsx:45** — `const review: any = ...`
- **src/components/records/RecordsTable.tsx:154** — `record: any`
- **src/components/layout/Sidebar.tsx:68** — `review]: [string, any]`
- **src/pages/ProjectDetailPage.tsx:51, 64** — Multiple `any` annotations
- **src/pages/ProjectsPage.tsx:55** — `review]: [string, any]`
- **src/pages/AuditPage.tsx:96** — `record: any`
- **src/pages/AdminAccounts.tsx:85** — `value: any`

### 1.2 Silent Error Logging
Multiple places use generic `console.error("Error")` without actual error details:
- **src/components/records/RecordBrowser.tsx:96**
- **src/components/records/AddRecordModal.tsx:101**
- **src/components/audit/AutomatedAuditModal.tsx:96, 154, 191**
- **src/components/layout/Header.tsx:62**
- **src/components/ui/error-boundary.tsx:25**
- **src/pages/ProceduresPage.tsx:134**
- **src/pages/AuthCallback.tsx:41, 52**
- **src/pages/NotFound.tsx:8**

### 1.3 Magic Strings & Hardcoded Values
- **src/lib/ManualContent.ts, src/lib/ProceduresContent.ts** — Hardcoded company data (Vezloo, employee names, etc.)
- **src/components/records/RecordCard.tsx:75, 186, 237** — Hardcoded fallback `"General / All Company"` (also duplicated across files)
- **src/components/records/EditMetadataModal.tsx:47, 55**
- **src/components/records/AddRecordModal.tsx:38, 43**
- **src/lib/googleSheets.ts:321**

### 1.4 Duplicate Code Patterns
- Project name normalization logic duplicated in multiple files:
  - `rawProj === "General / All Company" ? "General" : rawProj`
  - Found in: `RecordCard.tsx`, `ProjectDetailPage.tsx`, `ProjectsPage.tsx`, `AuditPage.tsx`

---

## 2. Performance Issues

### 2.1 Large File Sizes
Some files are excessively large and would benefit from splitting:
- **src/components/risk/RiskRegisterTab.tsx** — 678 lines
- **src/components/risk/CapaRegisterTab.tsx** — 496 lines
- **src/components/records/RecordBrowser.tsx** — 348 lines
- **src/pages/AuditPage.tsx** — 673 lines
- **src/pages/AdminAccounts.tsx** — 538 lines
- **src/pages/ModulePage.tsx** — 573 lines

### 2.2 Missing Memoization
- **119 instances** of `useEffect`, `useMemo`, or `useCallback` found — many likely missing memoization dependencies or could be optimized
- No `React.memo` wrappers on list item components (e.g., `RecordCard`)

### 2.3 Large Static Data in Modules
- **src/lib/ManualContent.ts** (~38KB) — Large ISO manual content
- **src/lib/ProceduresContent.ts** (~24KB) — Large procedures content
- **Recommendation:** Move static content to separate JSON files and lazy-load

---

## 3. Security Issues

### 3.1 Weak Password Hashing in Local Auth
- **src/hooks/useAuth.tsx:44-51** — Uses basic SHA-256 with hardcoded salt
- No bcrypt/Argon2, no pepper, no iteration count
- Local auth fallback stores passwords in localStorage (line 40: `USERS_KEY`)

### 3.2 Missing Input Validation
- **src/lib/validation.ts** — Has validation utilities but many components don't use them
- No server-side validation observed

### 3.3 Potential XSS in Dynamic Content
- **src/components/risk/RiskRegisterTab.tsx** — Renders user-provided risk descriptions without sanitization
- **src/lib/ManualContent.ts** — Contains raw HTML-like content rendered via `dangerouslySetInnerHTML` (likely)

---

## 4. Error Handling Issues

### 4.1 Empty Catch Blocks
- **src/hooks/useAuth.tsx:41, 54, 67, 90, 116** — Multiple `catch { return [] }` swallowing errors

### 4.2 Inconsistent Error Propagation
- **src/lib/googleSheets.ts** — Mixes return `{ error: string }` and `throw new Error()`
- **src/lib/driveService.ts** — Likely similar inconsistency

### 4.3 Missing Error Boundaries
- No error boundaries on major page components
- One exists: `src/components/ui/ErrorBoundary.tsx` but not applied to pages

---

## 5. Unused Imports & Dead Code

### 5.1 Unused Imports
Could not fully verify without running analyzer, but potential issues:
- **src/lib/validation.ts:82** — `useState`, `useCallback` imported but used in hook that's likely unused elsewhere

### 5.2 Duplicate Hook Files
- **src/hooks/use-toast.ts** and **src/components/ui/use-toast.ts** — Duplicate implementations

### 5.3 Likely Dead Code
- `src/lib/exportUtils.ts` — Only `console.warn`, may be incomplete
- `src/integrations/lovable/index.ts` — Appears unused based on imports

---

## 6. Additional Observations

### 6.1 Missing TypeScript Strictness
- Many `any` types suggest gradual typing adoption
- No strict null checks enforced

### 6.2 Inconsistent Status Checking
- Multiple patterns for checking record status:
  - `record.auditStatus === "✅ Approved"`
  - `s.includes("approved")`
  - `status.includes("approved")`

### 6.3 No Loading States for Some Operations
- `RiskRegisterTab`, `CAPARegisterTab` — Async operations without visible loading states in some areas

### 6.4 API Call Efficiency
- **src/lib/auditCheckService.ts** — Sequential API calls (line 218+)
- Could benefit from batching/pooling

---

## Summary

| Category | Count |
|----------|-------|
| `any` type usages | ~12 |
| Silent `console.error` | ~10 |
| Hardcoded strings | ~15 |
| Files >500 lines | 5 |
| Empty catch blocks | ~5 |

**Top Priorities:**
1. Replace `any` types with proper interfaces
2. Add meaningful error messages to all `console.error` calls
3. Extract magic strings to constants
4. Split large components
5. Fix password hashing (use bcrypt/Argon2 or move to Supabase Auth only)
