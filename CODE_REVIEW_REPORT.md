# QMS Code Review Report

**Date:** April 6, 2026  
**Reviewer:** Kilo ⚡  
**Scope:** `src/components/`, `src/lib/`, `src/pages/`

---

## Summary

| Category | Count |
|----------|-------|
| Errors | 19 |
| Warnings | 12 |
| Files Analyzed | ~80 |
| Total Lines | ~22,327 |

---

## 1. Type Safety Issues (High Priority)

### Excessive use of `any` type

| File | Line | Issue |
|------|------|-------|
| `src/components/layout/Sidebar.tsx` | 68 | `review: any` in fileReviews iteration |
| `src/components/records/RecordCard.tsx` | 45 | `review: any` |
| `src/components/records/RecordsTable.tsx` | 154 | `any` type parameter |
| `src/pages/AdminAccounts.tsx` | 85 | `value: any` in handleRowEdit |
| `src/pages/AuditPage.tsx` | 96 | `any` type |
| `src/pages/ProjectDetailPage.tsx` | 51, 64, 67 | Multiple `any` usages |
| `src/pages/ProjectsPage.tsx` | 55 | `any` type |

**Recommendation:** Define proper interfaces for file reviews and user update values.

---

## 2. Missing Error Handling

### Unhandled API errors in services

| File | Issue |
|------|-------|
| `src/lib/googleSheets.ts` (lines 374, 675) | Unnecessary try/catch wrappers - empty catch blocks |
| `src/lib/driveService.ts` (lines 406, 444, 514) | Unnecessary try/catch wrappers |
| `src/lib/driveService.ts` (line 383) | Empty block statement |

**Example (driveService.ts:383):**
```typescript
} catch (e) {
  // Empty - errors silently swallowed
}
```

---

## 3. React Hooks Issues

### Missing dependencies in useEffect/useMemo

| File | Line | Issue |
|------|------|-------|
| `src/components/layout/Sidebar.tsx` | 83 | Missing `expandedItems` in useEffect |
| `src/components/records/RecordBrowser.tsx` | 85 | Missing `files.length` and `loadFiles` |
| `src/pages/ArchivePage.tsx` | 58 | Missing `loadArchivedFiles` and `toast` |
| `src/pages/AuditPage.tsx` | 338 | Missing `dateFilter`, `projectFilter`, `yearFilter` |

**Risk:** Stale closures can cause unexpected behavior.

---

## 4. Anti-Patterns & Code Smells

### Dead code / Unused expressions

| File | Line | Issue |
|------|------|-------|
| `src/pages/AdminAccounts.tsx` | 163 | `next.has(id) ? next.delete(id) : next.add(id)` - expression without assignment |
| `src/pages/ArchivePage.tsx` | 99 | Same pattern |

**Fix:**
```typescript
// Instead of:
next.has(id) ? next.delete(id) : next.add(id);

// Use:
if (next.has(id)) next.delete(id);
else next.add(id);
```

---

## 5. Empty Interface Definitions

| File | Line | Issue |
|------|------|-------|
| `src/components/ui/command.tsx` | 24 | Empty interface `CommandPrimitive` |
| `src/components/ui/textarea.tsx` | 5 | Empty interface |

These are redundant and should be removed or extended.

---

## 6. Security Observations

### Positive Findings:
- ✅ Auth tokens handled server-side via `/api/token`
- ✅ Environment variables used for API keys (`VITE_GOOGLE_API_KEY`)
- ✅ Supabase functions used for sensitive operations (password updates)

### Areas to Review:
- `src/lib/auth.ts` - Token caching is client-side; ensure token expiry is handled correctly
- `src/pages/AdminAccounts.tsx` - Password reset logic appears secure via Supabase Edge Functions

---

## 7. Performance Considerations

### Potential Issues:

1. **No pagination** - Large record lists render all items at once
   - `src/components/records/RecordsTable.tsx`
   - `src/pages/ArchivePage.tsx`

2. **Repeated API calls** - Each record audit makes individual API calls
   - `src/lib/auditCheckService.ts` - Already batched (4 records/batch), but could be optimized further

3. **Memoization missing** - Some expensive computations not memoized
   - `src/components/layout/Sidebar.tsx` - `projects` useMemo is good, but verify other heavy computations

---

## 8. UI Component Issues (Shadcn/ui)

### Fast Refresh Warnings (Non-critical):
Many shadcn/ui components export constants alongside components. These generate warnings during development but don't affect production. However, they could be split into separate files:

- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/form.tsx`
- And ~8 more

---

## 9. Unused Imports

No significant unused import findings - ESLint passed on this.

---

## 10. Recommendations

### Quick Wins (High Impact):
1. **Add proper types** for `fileReviews` - create a `FileReview` interface
2. **Fix the ternary expressions** in AdminAccounts.tsx and ArchivePage.tsx (lines 163, 99)
3. **Remove empty catch blocks** or add proper error handling

### Medium Effort:
4. **Add React.memo** to frequently re-rendered components like `RecordCard`
5. **Implement virtualization** for large lists (react-window)
6. **Add loading skeletons** for better UX during API calls

### Long-term:
7. **Migrate from `any`** to strict TypeScript
8. **Add error boundaries** around major sections
9. **Consider React Query** for data fetching (currently using custom hooks)

---

## Files With Most Issues

| Rank | File | Issues |
|------|------|--------|
| 1 | `src/pages/AdminAccounts.tsx` | 4 errors |
| 2 | `src/pages/AuditPage.tsx` | 2 errors, 1 warning |
| 3 | `src/components/layout/Sidebar.tsx` | 1 error, 1 warning |
| 4 | `src/lib/driveService.ts` | 4 errors |
| 5 | `src/lib/googleSheets.ts` | 2 errors |

---

*Report generated automatically by Kilo ⚡*
