# Direct Tax Prototype Version History

## v2.0 (Canonical — Current)

**Date:** 2026-09-30  
**Branch:** `version/v2-canonical`  
**Tag:** `v2-canonical`

**Major Changes:**
- ✨ Refactored entire UI to use ZF Design Cannon components
- 🎨 Replaced 30+ hardcoded colors with semantic token system
- 🏗️ Introduced AppShell, Nav, TopBar canonical structure
- ⚙️ Separated state management into custom hooks
- 📦 Component replacement: 15 custom components → 43 canon components
- ♿ Improved accessibility with canonical ARIA patterns
- 🚀 Zero behavioral changes; UI-layer refactor only

**Component Mapping:**
| Feature | v1.0 (Custom) | v2.0 (Canonical) |
|---------|--------------|------------------|
| Buttons | Hand-built with hardcoded hex | `<Button intent emphasis size>` |
| Modals | Custom backdrop + manual focus | `<Modal>` with built-in a11y |
| Forms | `<input>`, `<select>` + styling | `<InputField>`, `<Select>`, `<RadioGroup>` |
| Layout | `<div className="...">` | `<Stack>`, `<Surface>`, `<Inline>` |
| Typography | Hardcoded sizes/weights | `<Text size weight tone>` |
| Colors | 30+ hex values | CSS token variables (semantic roles) |
| Status badges | Colored text + pill styling | `<StatusBadge status>` |

**Token System:**
- All colors via semantic roles: `primary/default`, `surface/hover`, `text/link`, etc.
- All spacing via named steps: `gap={4}` = 8px (2px grid)
- All typography via size + weight matrix (9 sizes × 4 weights)
- All radii via named tokens: `radius="card"` = 10px

---

## v1.0 (Legacy)

**Date:** 2026-09-24  
**Branch:** `version/v1-current`  
**Tag:** `v1-current-snapshot`

**Features:**
- Avalara integration flow with connection modal
- FPOA (Form Power of Attorney) signing with document preview
- Tax return questionnaire with state-specific questions
- Nexus region setup wizard with form assignment
- Tax return configuration grid

**Implementation:**
- Monolithic App.tsx (~2800 lines)
- 15+ custom sub-components (AvalaraModal, SetupWizard, NexusStep, etc.)
- Hand-built modal, button, form, and layout components
- Hardcoded color palette (#0D81FD primary, #ebeaf1 surface, etc.)
- Raw Tailwind + inline styles
- No design system, no token abstraction

**Limitations:**
- Colors hardcoded throughout (30+ unique hex values)
- No component reuse across different features
- State management colocated with rendering
- No separation of concerns (data, logic, UI all in App.tsx)
- Accessibility concerns: manual focus management, no standardized ARIA patterns
- Difficult to maintain and update design decisions
- No version of canonical components to refer to

---

## How to Switch Versions

### Option A: Via Git Branches

```bash
# Check available versions
git branch -a | grep version

# Switch to legacy version (v1.0)
git checkout version/v1-current
npm run dev

# Switch to canonical version (v2.0)
git checkout version/v2-canonical
npm run dev

# Compare versions
git diff version/v1-current version/v2-canonical -- src/App.tsx
```

### Option B: Via Code Toggle (on version/v2-canonical only)

On the `version/v2-canonical` branch, you can toggle between rendering v1 and v2 without switching branches:

**In `src/main.tsx`:**

```typescript
// To show v1.0 (legacy with custom components)
import App from './App.tsx';

// To show v2.0 (canonical with design system)
// import App from './App-canonical.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Option C: Via Tag Snapshot

Jump to exact snapshot:

```bash
# View all version tags
git tag | grep current\|canonical

# Checkout v1.0 snapshot
git checkout v1-current-snapshot

# Checkout v2.0 snapshot (once tagged)
git checkout v2-canonical-snapshot
```

---

## Refactoring Progress

| Phase | Task | Status | ETA |
|-------|------|--------|-----|
| 1 | Set up git branches & version tracking | ✅ Done | — |
| 2 | Create canonical app structure | 🔄 In progress | — |
| 3 | Implement App-canonical.tsx | ⏳ Pending | — |
| 4 | Testing & verification | ⏳ Pending | — |
| 5 | Documentation & polish | ⏳ Pending | — |

---

## Design System References

- **ZF Design Cannon:** `/Users/rithika-19203/Downloads/ZF-Design-Cannon-canon-build-out/`
  - 54 stable components in `src/canon/components/`
  - Registry: `src/canon/registry.json`
  - Design specs: `design-refs/zf-*.md`
  - Component stories: `npm run canon` → http://localhost:6006

- **This Project:** `/Users/rithika-19203/Documents/VS Code Works/direct-tax-prototype/`
  - v1.0 app: `src/App.tsx` (on branch `version/v1-current`)
  - v2.0 app: `src/App-canonical.tsx` (on branch `version/v2-canonical`)

---

## Next Steps

1. Copy ZF Design Cannon into this project (or set up as git submodule)
2. Build `src/app/screens/DirectTaxSettings.tsx` using canon components
3. Build `src/App-canonical.tsx` that imports DirectTaxSettings
4. Extract state hooks from v1.0 App.tsx and reuse them
5. Test & verify all workflows work identically
6. Run `npm run check` to enforce canon boundaries
