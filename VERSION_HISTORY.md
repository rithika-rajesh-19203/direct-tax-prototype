# Direct Return Filing Prototype — Version History

This file tracks what has changed in the prototype and what is planned next.

**How it's maintained**
- Every change is added under the version in progress (currently **v2.0**) as it's made.
- When the version in progress is ready, it's released with a date, a git tag and a commit, and the next version starts.
- Each released version is also frozen as a copy in `src/versions/` and listed in `src/versions/registry.ts`, so it can be opened from the version dropdown in the app.
- Ideas and requests that haven't been built yet go under **Planned**. Items move from Planned to the version in progress when work starts.

---

## v2.0 — in progress

**Status:** in progress, not yet released
**In the app:** "v2.0 · In progress" in the version dropdown
**Public link:** https://rithika-rajesh-19203.github.io/direct-tax-prototype/ (published Oct 5, 2026, with the version dropdown; `?v=v1.0` opens a specific version)

- **Smaller Configure Direct Return Filing card**, so the setup steps stand out:
  - The card is one compact row: a smaller icon, the title and subtitle, a **Learn more** link and the **Set up Direct Return Filing** button.
  - The benefit points and **How your tax is calculated** are hidden behind **Learn more**, collapsed by default.
  - **Set up Direct Return Filing** stays the primary (blue) button.
  - The opened details are lined up with the card title on a light grey panel, with matching **What you get** and **How your tax is calculated** column headings and even spacing. Learn more / Hide details keeps the same width, so the header doesn't shift.
- **Version switcher** in the top bar, next to Help: a dropdown listing every version (newest first) with its date and summary. Picking one loads that version with fresh data. The choice is remembered and added to the URL (for example `?v=v1.0`), so a specific version can be shared.
  - "v2.0" is the current work; each released version is a frozen copy in `src/versions/`.
  - Also lists **Public build (Oct 1, 2026)**: the version on https://rithika-rajesh-19203.github.io/direct-tax-prototype/ (commit `c7aace7`), frozen in `src/versions/public-2026-10-01.tsx`.
  - Also lists **Onslate prototype (Sep 29, 2026)**: an archived copy of https://direct-tax-prototype-mdyrqkyj.onslate.in/. That site doesn't allow embedding, so its published build is kept in `public/versions/onslate-2026-09-29/` and shown under a thin "Archived version" bar with an **Open original** link.

---

## Planned

| # | Change | Notes |
|---|--------|-------|
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
| Onslate prototype | `public/versions/onslate-2026-09-29/` (build copied from the site, built Sep 29, 2026) | Earlier prototype at direct-tax-prototype-mdyrqkyj.onslate.in; selectable from the version dropdown |
| Public build | commit `c7aace7`, in the app as **Public build** | What the public URL shows today; selectable from the version dropdown |

To open any of them: `git checkout <git ref>`.
