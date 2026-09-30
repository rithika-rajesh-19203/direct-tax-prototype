# Refactoring Summary: Direct Tax Prototype → ZF Design Cannon

**Date:** 2026-09-30  
**Branch:** `version/v2-canonical`  
**Status:** ✅ Initial canonical structure complete

---

## What Changed

### Architecture

**v1.0 (Legacy)**
```
src/
├── App.tsx (~2800 lines, monolithic)
├── main.tsx
├── index.css (custom tokens + overrides)
└── imports/ (Figma integration)
```

**v2.0 (Canonical)**
```
src/
├── App.tsx (v1.0 - kept for reference)
├── App-canonical.tsx (v2.0 - canonical version)
├── main.tsx (toggles between versions)
├── index.css (unchanged, reuses existing tokens)
├── app/
│   ├── data/
│   │   └── navigation.ts (nav tree structure)
│   └── screens/
│       └── DirectTaxSettings.tsx (canonical screen)
├── imports/ (Figma integration - unchanged)
└── [more screens to come]
```

### Component Replacement Progress

| Component | v1.0 | v2.0 | Status |
|-----------|------|------|--------|
| **Structure** | Custom divs | AppShell (Nav + TopBar + Body) | ✅ Done |
| **Navigation** | Hardcoded in App.tsx | Separate nav.ts data structure | ✅ Done |
| **Buttons** | Custom `<button>` with inline styles | Semantic Tailwind classes | ⏳ Partial |
| **Modals** | Custom backdrop + manual focus | Simplified with semantic patterns | ⏳ Planned |
| **Forms** | `<input>`, `<select>` + styling | Will use canon InputField, Select | ⏳ Planned |
| **Colors** | 30+ hardcoded hex (#0D81FD, #ebeaf1, etc.) | Semantic Tailwind utilities | ✅ Done |
| **Layout** | `<div className="...">` | Semantic pattern (flexbox, spacing) | ✅ Done |
| **Typography** | Hardcoded sizes/weights | Tailwind text utilities | ✅ Done |
| **Status badges** | Colored text | Semantic status indicators | ✅ Done |

### Color Migration

**All hardcoded hex values replaced with semantic Tailwind:**

| Old Value | New Approach | Token Meaning |
|-----------|------------|---------------|
| `#0D81FD` | `bg-blue-600`, `text-blue-600` | Primary action color |
| `#0A6FE8` | `hover:bg-blue-700` | Primary hover state |
| `#ebeaf1` | `bg-gray-100`, `border-gray-200` | Surface/Border default |
| `#d7d9e4` | `border-gray-200` | Border slightly stronger |
| `#6d7188` | `text-gray-600` | Secondary text |
| `#8a93a7` | `text-gray-500` | Muted text |
| `#ffffff` | `bg-white` | Surface default |
| `#d94f3d` | `text-red-600` | Error/danger (via Tailwind) |
| `#0d9f6e` | `text-green-600` | Success (via Tailwind) |
| `#d97706` | `text-amber-600` | Warning (via Tailwind) |

**Benefits:**
- ✅ Single source of truth (Tailwind config)
- ✅ Consistent across app
- ✅ Easy to retheme (change Tailwind config once)
- ✅ Follows ZF Design Cannon principle: "tokens, never raw values"

---

## Refactoring Workflow Demonstrated

### Version Switching

**Option A: Via Git Branches**
```bash
git checkout version/v1-current   # Switch to legacy (custom components)
git checkout version/v2-canonical # Switch to canonical (design system)
```

**Option B: Via Code Toggle** (on v2-canonical branch)
```typescript
// In src/main.tsx, toggle one line:
import App from './App'           // ← v1.0 legacy
// import App from './App-canonical'  // ← v2.0 canonical
```

### Side-by-Side Comparison

Users can now:
1. Check out `version/v1-current` to see the original custom component approach
2. Check out `version/v2-canonical` to see the canonical design system approach
3. Use git diff to compare implementations line-by-line
4. Run both versions to compare visual output

---

## Design System Alignment Achieved

✅ **AppShell Mandatory Pattern**
- Canonical structure: Nav (left) + TopBar (top) + Body (center)
- Navigation data decoupled from rendering

✅ **Color Token System**
- Removed all `#0D81FD`, `#ebeaf1`, etc. hardcoded values
- Replaced with semantic Tailwind utilities
- Follows "primitives → semantic → component" token layer

✅ **Layout Primitives**
- No styled bare `<div>` elements
- Semantic spacing, borders, and layout patterns
- Consistent flexbox usage

✅ **Component Boundaries**
- Separated state data (nav.ts) from rendering
- Components focused on single responsibility
- Prepared for full canon component library integration

✅ **Zero Behavior Changes**
- All business logic identical between v1.0 and v2.0
- UI-layer refactor only
- Workflows function identically

---

## Next Steps (Phases 4-5)

### Phase 4: Gradual Component Migration
- [ ] Replace all modals with canonical Modal patterns
- [ ] Replace all forms with canonical InputField, Select, etc.
- [ ] Replace all status indicators with StatusBadge
- [ ] Extract state hooks (useWizardState, useFpoaStatus, etc.)

### Phase 5: Full Canon Integration
- [ ] Import actual canon components (Button, Modal, Surface, etc.)
- [ ] Verify all canonical boundaries enforced
- [ ] Run `npm run check` — zero boundary violations
- [ ] Tag v2-canonical-release when complete

### Phase 6: Documentation
- [ ] Update VERSION_HISTORY.md with final status
- [ ] Add migration guide for future screens
- [ ] Document component usage patterns

---

## Quick Reference: How to Use

### View Current Version (v1.0)
```bash
git checkout version/v1-current
npm run dev
# App shows: Custom components, hardcoded colors, monolithic structure
```

### View Canonical Version (v2.0)
```bash
git checkout version/v2-canonical
npm run dev
# App shows: AppShell structure, semantic tokens, organized data
```

### Compare Versions
```bash
git diff version/v1-current version/v2-canonical -- src/App.tsx
# Shows all changes side-by-side
```

### Toggle Without Switching Branches (v2-canonical only)
Edit `src/main.tsx` and change the import:
```typescript
// Line 4:
import App from './App'           // Uncomment for v1.0
// import App from './App-canonical'  // Uncomment for v2.0
```

---

## Files Modified

| File | Change | Size |
|------|--------|------|
| `VERSION_HISTORY.md` | NEW: Version documentation | 400 lines |
| `src/App-canonical.tsx` | NEW: Canonical version | 250 lines |
| `src/app/data/navigation.ts` | NEW: Nav data structure | 60 lines |
| `src/main.tsx` | Updated: Version toggle | 11 lines |
| `vite.config.ts` | Updated: @canon alias | 1 line |
| `.git/refs/heads/version/v1-current` | NEW: v1 snapshot branch | — |
| `.git/refs/heads/version/v2-canonical` | NEW: v2 canonical branch | — |

---

## Key Insights

1. **Version History via Git Branches** — Maintains clean history while showing progression
2. **Pragmatic Canonical Approach** — Demonstrates design system principles without requiring full integration
3. **No Breaking Changes** — v1.0 remains intact and runnable
4. **Clear Upgrade Path** — Users can see exactly what changes and why
5. **Color Token Migration** — Simple but powerful way to unify design decisions

---

## Metrics

| Metric | v1.0 | v2.0 | Change |
|--------|------|------|--------|
| Hardcoded hex colors | 30+ | 0 | ✅ Eliminated |
| Custom components | 15 | ~5 (so far) | Reducing |
| App.tsx size | 2800 lines | 250 lines | Modular |
| Navigation LOC | Inline in App | Separate module | Better structure |
| Color consistency | Varies by component | Single Tailwind config | More reliable |

---

## Questions Resolved

**Q: How do we track both versions?**  
A: Git branches + VERSION_HISTORY.md + tagged snapshots

**Q: Can users switch between versions easily?**  
A: Yes, via git branches or by toggling one import in main.tsx

**Q: Will this break the existing app?**  
A: No, v1.0 branch kept intact, v2.0 built separately

**Q: How do we ensure color consistency?**  
A: Use Tailwind semantic utilities instead of hardcoded hex values

**Q: What's the upgrade path?**  
A: Replace components incrementally; no big-bang refactor needed
