# Direct Return Filing Prototype — Version History

This file tracks what has changed in the prototype and what is planned next.

**How it's maintained**
- Every change is added under the version in progress (currently **v4.0**) as it's made.
- When the version in progress is ready, it's released with a date, a git tag and a commit, and the next version starts.
- Each released version is also frozen as a copy in `src/versions/` and listed in `src/versions/registry.ts`, so it can be opened from the version dropdown in the app.
- Ideas and requests that haven't been built yet go under **Planned**. Items move from Planned to the version in progress when work starts.

---

## v4.0 — in progress

**Status:** in progress, not yet released or published
**In the app:** "v4.0 · In progress" in the version dropdown

1. **Tax forms is the centre of action** on the Direct Return Filing page:
   - **Tax forms by nexus** moves to the top, right under the page title. It's highlighted with a blue border and soft glow and a larger heading, and its subtitle says how many states still need forms.
   - **Status is a slim header** instead of a card: "Direct Return Filing · Active" with a short line of text and a quiet **Disable** button.
   - **Setup and authorization is downplayed** below the table: a grey, one-line summary ("2 of 5 steps done · Bank not connected · FPOA not signed", plus a **Next:** link) that's collapsed by default. **Show details** opens Setup progress, bank account and FPOA as before.
2. **Setup and configuration come before tax forms:**
   - Setup and authorization now sits **above** Tax forms by nexus.
   - Until the first four steps (registrations, Avalara, bank account, FPOA) are done, it's titled **Finish setting up** and highlighted. Tax forms is greyed out with an "After setup" tag, and its **Add tax forms** buttons are disabled.
   - Once those steps are done, setup collapses to its grey one-line summary and Tax forms becomes the highlighted area.
3. **Save works without tax forms:** on Add tax forms, **Save** is always enabled (and ⌘/Ctrl + S always saves), even when no forms are added or nothing has changed. It reads **Save changes** when there are unsaved changes.
4. **Richer setup summary line:** the step count is a segmented bar (green for done, blue for next) with "1/5 done". Every unfinished setup step is a link that does it (**Add Tax Registration**, **Connect bank account**, **Sign FPOA**), with the next one in bold and marked "Next:"; finished steps show a green tick.
5. **Less repetition in setup details:** opening the details shows just the step list. There's no second "Setup progress" header, bar or count, and the summary line drops its step links while it's open. The separate Bank account and FPOA rows are gone; their details sit in the step rows ("Chase ••4821 · Change", "Signed Oct 6, 2026 · View document"). Step 5 points to "Continue in Tax forms below" instead of repeating the table's buttons.
6. **Same setup card on the first page:** Setup progress on the first page now uses the same summary card as the Direct Return Filing page: segmented "*n*/5 done" bar, **Next: Add Tax Registration** and **Connect Avalara** links, and **Show / Hide details** for the step list (open by default). Step 2's shortcut is renamed from **Set up** to **Connect Avalara**.
7. **Tax forms in the setup summary line:** the Direct Return Filing page's summary now covers step 5 too: a greyed "🔒 Tax forms after setup" until setup is done, then a **Next: Add tax forms** link that opens the Add tax forms page, and "✓ Tax forms" once every state has forms. Finished steps use short labels ("✓ Registrations", "✓ Bank", "✓ FPOA") so the line stays on one row.
8. **Setup summary card split into two rows** (both pages), replacing the single crowded line:
   - **Row 1:** title, segmented progress with "*n* of 5 done", and **Show all steps / Hide steps** on the right.
   - **Row 2** (when collapsed): one chip per step, in order. Done steps are green chips with a tick; the next step is the only solid blue button ("Next · Connect bank account ›"); other open steps are outlined chips; steps that can't start yet are grey with a lock.
9. **Setup starts collapsed once Direct Return Filing is enabled:** on the Direct Return Filing page the setup card always opens collapsed (title, progress and the step chips); **Show all steps** expands it.

---

## v3.0 — Bank account, FPOA modal and quicker tax forms

**Date:** 2026-10-06
**Tag:** `v3.0`
**File:** `src/versions/v3-0.tsx`

1. **Learn more moved under the subtitle** in the Configure Direct Return Filing card, so the button stays alone on the right.
2. **Clearer setup steps:** each step's name is a heading, with a fuller description on its own line underneath.
3. **Avalara logo** at the top of the Connect to Avalara pop-up, with a "Certified partner" badge.
4. **New step: Bank account**, before Sign FPOA (setup now has five steps).
   - **Connect a bank account** pop-up: pick an account already in Zoho Books, or add a new one (bank name, nickname, routing and account numbers, checking or savings).
   - A **Bank account for tax payments** section on the Direct Return Filing page shows the connected account, with **Change**.
   - Disable clears the bank account along with the FPOA and tax forms.
5. **FPOA in a PDF modal:** the FPOA section is now one compact row with **View and sign FPOA**. The real Acrobat Sign document opens in a large modal, with **Open in new tab**, **Close** and **I've signed the document**. Once signed, **View signed document** reopens it.
6. **Add tax forms is a primary button** in each row of the Tax forms table that still needs forms. Rows that already have forms show an **Edit tax forms** link.
7. **Collapsible Setup progress:** a chevron button at the right end of the card header toggles the step list. Once Direct Return Filing is active, Setup progress starts collapsed, showing just the progress bar and the next step. When collapsed, the next step sits below a divider in a light-blue **Up next** strip with its number, name, description and a primary shortcut button. When collapsed, it shows the progress bar and the next step with its shortcut.
8. **Add a new bank account is a link** under the list of existing accounts, not a radio option. It opens the new-account form, with **Choose an existing account instead** to go back.
9. **Bank details beside the FPOA:** the FPOA modal has a **Your bank details** panel with the selected account's name, bank, account number, routing number and type, each with **Copy**, to enter in the FPOA's bank section. The modal also shows a loading message and an **Open it in a new tab** fallback while the document loads.
10. **Fewer primary buttons:** only the next unfinished step in Setup progress has a primary button; other step shortcuts are links. The **Add tax registration** button below is secondary (outlined).
11. **Bank account and FPOA in one compact card:** two single-line rows (name, details, status, action link) instead of two large cards. Actions are links: **Connect / Change** for the bank, **View and sign / View document** for the FPOA.
12. **Three distinct sections** on the Direct Return Filing page, with more space between them:
    - **Status:** the Direct Return Filing · Active card with **Disable**.
    - **Setup and authorization:** Setup progress in its own card, with the bank account and FPOA rows in a separate card below it.
    - **Tax forms:** the Tax forms by nexus table.

13. **Add tax forms page:**
    - **Answer questionnaire** sits under the questionnaire's description instead of on the right.
    - The optional **Tax questionnaire** is a light-blue callout, set apart from the **Nexus and tax forms** section, which has its own heading, divider and state count.
    - Each state card has a primary **Add form** button and a **⋮ More** menu on the right, with **Clear all forms** and **Delink state**.
    - **Delink state** asks for confirmation. A delinked state stays in Tax registrations but is taken out of Direct Return Filing when you save; it's listed under the cards as "Delinked" with **Link again**.
14. **Quicker saving on Add tax forms:**
    - A save bar is always visible at the bottom, showing "*n* unsaved changes" or "All changes saved", with **Discard** and **Save changes** (both disabled when nothing has changed). It replaces the old **Save setup** button at the end of the list.
    - **⌘/Ctrl + S** saves from anywhere on the page.
    - **Back** with unsaved changes asks first: **Keep editing**, **Discard** or **Save and go back**.
    - After saving, a "Tax forms saved" message appears briefly at the bottom of the screen.
15. **Add tax forms pop-up is one screen:** the dropdown is gone. A search box filters a checklist of the state's forms that's always visible; forms already added are ticked and greyed out. The footer shows "*n* selected" next to **Add *n* forms** and **Cancel**.
16. **Add tax registration from the Add tax forms page:** an **+ Add tax registration** link in the Nexus and tax forms header opens the New Tax Registration pop-up. The registration is saved right away, the state appears as a new card ready for forms, and a "New York registered. Add its tax forms below." message confirms it.
---

## v2.0 — Compact Configure card and version switcher

**Date:** 2026-10-06
**Tag:** `v2.0`
**File:** `src/versions/v2-0.tsx`
**Public link:** https://rithika-rajesh-19203.github.io/direct-tax-prototype/ (published Oct 5, 2026; `?v=v2.0` opens this version)

- **Smaller Configure Direct Return Filing card**, so the setup steps stand out:
  - The card is one compact row: a smaller icon, the title and subtitle, a **Learn more** link and the **Set up Direct Return Filing** button.
  - The benefit points and **How your tax is calculated** are hidden behind **Learn more**, collapsed by default.
  - **Set up Direct Return Filing** stays the primary (blue) button.
  - The opened details are lined up with the card title on a light grey panel, with matching **What you get** and **How your tax is calculated** column headings and even spacing. Learn more / Hide details keeps the same width, so the header doesn't shift.
- **Version switcher** in the top bar, next to Help: a dropdown listing every version (newest first) with its date and summary. Picking one loads that version with fresh data. The choice is remembered and added to the URL (for example `?v=v1.0`), so a specific version can be shared.
  - The version in progress is the current work; each released version is a frozen copy in `src/versions/`.
  - Also lists **Public build (Oct 1, 2026)**: the version on https://rithika-rajesh-19203.github.io/direct-tax-prototype/ (commit `c7aace7`), frozen in `src/versions/public-2026-10-01.tsx`.
  - Also lists **Onslate prototype (Sep 29, 2026)**: an archived copy of https://direct-tax-prototype-mdyrqkyj.onslate.in/. That site doesn't allow embedding, so its published build is kept in `public/versions/onslate-2026-09-29/` and shown under a thin "Archived version" bar with an **Open original** link.

---

## Planned

| # | Change | Notes |
|---|--------|-------|
| 1 | Prefill the FPOA with the selected bank | The Acrobat Sign form ignores prefilled values in its link (tested with the form's field names `bkNam`, `acctNam`, `bkAcctNum`, `bkRoutNum`, `acctType`). True prefill needs the Adobe Acrobat Sign API, called from a server with the form owner's credentials. |
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
