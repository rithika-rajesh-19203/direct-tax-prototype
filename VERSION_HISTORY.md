# Direct Return Filing Prototype — Version History

This file tracks what has changed in the prototype and what is planned next.

**How it's maintained**
- Every set of changes is added under **Unreleased** as it's made.
- When a set is ready to share, it becomes the next version (v1.1, v1.2 … or v2.0 for a larger redesign), with a date, a git tag and a commit.
- Ideas and requests that haven't been built yet go under **Planned**. Items move from Planned to Unreleased when work starts.

---

## Unreleased

_No changes since v1.0._

---

## Planned

| # | Change | Notes |
|---|--------|-------|
| 1 | Publish v1.0 to the public URL | The public link still shows an earlier build. |
| 2 | Confirm automatic FPOA completion | The page listens for Adobe Acrobat Sign's "signed" event. This hasn't been tested end to end; until it is, users confirm with "I've signed the document". |
| 3 | Show the real signed FPOA on later visits | Needs Adobe Acrobat Sign API access to fetch the signed agreement. Today, a later visit shows a note that Adobe emailed the signed copy. |
| 4 | Keep data after a page reload | Registrations, tax forms and FPOA status reset on reload. |
| 5 | Undo for "Mark as completed" on step 1 | Once marked, step 1 can't be unmarked. |
| 6 | Consistent casing for "Add Tax Registration" | Setup progress uses title case; the Tax forms section button uses sentence case. |
| 7 | Set the browser page title | `index.html` still has a placeholder title, so the tab and link previews show no name. |

---

## v1.0 — Direct Return Filing setup

**Date:** 2026-10-05
**Branch:** `version/v3`
**Tag:** `v1.0`
**File:** `src/App-canonical.tsx`

v1.0 covers every change made to the prototype up to this date.

### Before setup (overview page)
- **Configure Direct Return Filing** card: icon, title, subtitle and a primary **Set up Direct Return Filing** button, with benefit points and a **How your tax is calculated** accordion.
- **Setup progress** card: a progress bar, "*n* of 4 completed", and one row per step with its description and actions on the right:
  1. **Tax registrations**: **Add Tax Registration**, or **Mark as completed**.
  2. **Connect Avalara**: **Set up**.
  3. **Sign FPOA** and 4. **Tax forms**: "After connecting".
- Steps are marked completed only when their action is actually finished, never by clicking them.
- **Connect to Avalara** pop-up, redesigned.

### Tax registrations
- A **Tax Registration** section with an empty state, a **New registration** form and a list of registrations.
- The Tax Registration side tab stays hidden until the first registration is saved. That first registration is made in a pop-up, and the user stays on the same page afterwards.
- Only registered states appear in Direct Return Filing.

### After connecting (Direct Return Filing page)
- Status card: **Direct Return Filing · Active**, with **Disable** behind a confirmation. Disabling clears tax forms and the FPOA but keeps registrations.
- The same **Setup progress** list as the overview page, with shortcuts to **Add Tax Registration**, **Sign FPOA** and **Add tax forms**. It hides once all four steps are done.
- **Form POA section**, which is a section on the page rather than a tab:
  - Loads the real FPOA (Avalara "ACHDebit Power of Attorney") from Adobe Acrobat Sign, with no overlay. Users fill it in and sign it inside the page, or open it in a new tab.
  - Marked signed when Acrobat Sign reports the signature, or when the user clicks **I've signed the document**.
  - Once signed, the section collapses to a Signed badge and date, with **View signed document** to open it on demand.
- **Tax forms by nexus** section:
  - One row per registered state, with an accordion that lists that state's forms.
  - **Add tax forms** on each row and **Add tax registration** in the header.
  - Opens a plain editor, not a wizard.

### Tax forms
- **Add tax forms** pop-up with a searchable multi-select dropdown.
- Optional questionnaire in a pop-up, with **Autofill** for quick prototyping. It suggests forms for each state and merges them into the existing ones.

### General
- Renamed "Direct Tax" to **Direct Return Filing** in the navigation and headings.
- The page stretches to the full width.
- Unified button and link sizes across the flow, and fixed a global CSS rule that enlarged button text.

---

## Earlier snapshots

These are kept in git for reference. They are earlier stages of the same work and are all included in v1.0.

| Snapshot | Git ref | What it was |
|----------|---------|-------------|
| First prototype | branch `version/v1-current`, tag `v1-current-snapshot` | Original single-file app with the setup wizard |
| Design system refactor | branch `version/v2-canonical` | UI rebuilt on the ZF Design Cannon structure |
| First public build | tag `v3` (commit `f96ee76`) | First version published to the public URL |

To open any of them: `git checkout <git ref>`.
