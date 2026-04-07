# QMS Code Review Report

**Date:** April 7, 2026  
**Scope:** `src/components/`, `src/lib/`, `src/pages/`  
**Total Lines:** ~22,690

---

## 1. Code Quality Issues

### 1.1 Excessive Use of `any` Type (Type Safety)
| File | Line | Issue |
|------|------|-------|
| `src/components/layout/Sidebar.tsx` | 68 | `review: any` in file reviews mapping |
| `src/components/records/EditMetadataModal.tsx` | 103 | `field: any` |
| `src/components/records/RecordBrowser.tsx` | 370-371 | Multiple `any` types in map callbacks |
| `src/components/records/RecordCard.tsx` | 46 | `item: any` |
| `src/components/records/RecordsTable.tsx` | 79, 94, 111, 157, 176 | Multiple `any` usages |
| `src/lib/driveService.ts` | 133, 143, 188, 198, 350, 651 | Multiple `any` in Google Drive API calls |
| `src/lib/auditCheckService.ts` | 352 | `data: any` |
| `src/pages/AdminAccounts.tsx` | 85 | `user: any` |
| `src/pages/AuditPage.tsx` | 96, 133, 179 | Multiple `any` usages |
| `src/pages/ModulePage.tsx` | 486 | `record: any` |
| `src/pages/ProjectDetailPage.tsx` | 51, 64, 67 | Multiple `any` usages |
| `src/pages/ProjectsPage.tsx` | 55 | `project: any` |

**Impact:** Loses TypeScript benefits, potential runtime errors.

### 1.2 Empty Interfaces (Redundant)
| File | Line |
|------|------|
| `src/components/ui/command.tsx` | 24 |
| `src/components/ui/textarea.tsx` | 5 |

**Issue:** Empty interface `interface Props extends React.HTMLAttributes<HTMLTextAreaElement> {}` is equivalent to the supertype.

---

## 2. React Hook Issues

### 2.1 Missing Dependencies in useEffect/useMemo
| File | Line | Issue |
|------|------|-------|
| `src/components/layout/Sidebar.tsx` | 83 | Missing `expandedItems` in useEffect |
| `src/components/records/RecordBrowser.tsx` | 85 | Missing `files.length` and `loadFiles` |
| `src/pages/ArchivePage.tsx` | 58 | Missing `loadArchivedFiles` and `toast` |
| `src/pages/AuditPage.tsx` | 394 | Missing `dateFilter`, `projectFilter`, `yearFilter` in useMemo |

**Impact:** Stale closures, potential bugs where hook doesn't re-run when expected.

### 2.2 Unused Expressions (Potential Bugs)
| File | Line | Issue |
|------|------|-------|
| `src/pages/AdminAccounts.tsx` | 163 | Expected assignment or function call |
| `src/pages/ArchivePage.tsx` | 99 | Expected assignment or function call |

**Impact:** Logic likely not executing as intended.

---

## 3. Error Handling Issues

### 3.1 Empty Catch Blocks
| File | Line |
|------|------|
| `src/lib/driveService.ts` | 383 |

**Issue:** Empty block statement catches error but does nothing.

### 3.2 Useless Try/Catch Wrappers
| File | Lines |
|------|-------|
| `src/lib/driveService.ts` | 406, 444, 514 |
| `src/lib/googleSheets.ts` | 375, 676 |

**Issue:** Catch block only re-throws the error with no additional handling:
```typescript
} catch (error) {
  // Error logged
  throw error;
}
```
This adds no value over removing the try/catch.

---

## 4. Performance Concerns

### 4.1 Interval Cleanup (Potential Memory Leak)
| File | Line | Issue |
|------|------|-------|
| `src/components/audit/AutomatedAuditModal.tsx` | 46 | `setInterval` without visible cleanup |
| `src/components/layout/Header.tsx` | 32 | Properly cleaned up ✓ |

**Recommendation:** Verify AutomatedAuditModal properly clears interval on unmount.

### 4.2 Debounce Implementation
| File | Line | Issue |
|------|------|-------|
| `src/components/layout/Header.tsx` | 55 | Properly cleaned up ✓ |
| `src/pages/ProceduresPage.tsx` | 112 | Properly cleaned up ✓ |

**Note:** Debounce is correctly implemented with cleanup.

---

## 5. Security Observations

### 5.1 Safe ✓
- No `eval()` usage found
- No SQL injection risks (no direct DB queries in frontend)
- No `dangerouslySetInnerHTML` with user input (chart.tsx uses it for static D3 rendering)

### 5.2 Potential Concern
| File | Line | Issue |
|------|------|-------|
| `src/components/ui/chart.tsx` | 70 | `dangerouslySetInnerHTML` with D3 (verify it's static/isolated) |

**Recommendation:** Confirm the D3-generated HTML doesn't include any user-controlled data.

---

## 6. Unused/Dead Code

### 6.1 Fast Refresh Warnings
Multiple UI components export non-component items alongside components (noted as warnings, not errors):
- `src/components/ui/ErrorBoundary.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/ui/toggle.tsx`

**Recommendation:** Move shared constants/types to separate files.

---

## 7. Missing Error Handling

### 7.1 Silent Failures in Search
| File | Line | Issue |
|------|------|-------|
| `src/components/layout/Header.tsx` | 67 | `console.error("Error")` - no user feedback |

**Issue:** Search errors are logged but user sees no indication of failure.

---

## Summary

| Category | Count |
|----------|-------|
| ESLint Errors | 37 |
| ESLint Warnings | 12 |
| `any` type usages | ~20+ |
| Missing useEffect deps | 4 |
| Useless try/catch | 6 |
| Empty catch blocks | 1 |

### Priority Actions
1. **High:** Replace `any` types with proper interfaces
2. **High:** Fix missing useEffect dependencies (causes stale data bugs)
3. **Medium:** Remove useless try/catch wrappers
4. **Medium:** Add user-facing error handling for search/API failures
5. **Low:** Move exported constants to separate files for HMR support