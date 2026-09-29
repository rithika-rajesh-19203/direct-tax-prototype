# Figma Prompt: Sales Tax Return Filing (Avalara Integration) for Zoho Books

You are an expert product designer. Design a complete, end-to-end UX for **Sales Tax Return Filing using Avalara** inside **Zoho Books (US & Canada editions)**. The target users are **small and medium business owners, accountants, and finance admins** who need to configure, review, approve, and file sales tax returns without leaving Zoho Books.

Use the requirements and edge cases below to create a **coherent, production-ready design system and flow** in Figma.

***

## 1. Product Context and Goals

**Product:** Zoho Books (web and responsive desktop).  
**Feature:** Sales Tax Return Filing via Avalara integration.  
**Users:** SMB owners, accountants, finance admins in the US and Canada.  
**Goal:** Allow users to:

- Enable tax-return filing with minimal setup.
- Configure where (which states/provinces) and how they file.
- Generate, review, adjust, approve, and file returns every period.
- Track status, payments, and deadlines clearly.
- Handle edge cases (manual filing, errors, multi-org, role-based access) gracefully.

**Design principles:**

- Clarity over completeness: prioritize understandable flows over showing every technical detail.
- Progressive disclosure: start simple, allow drill-down for power users.
- Trust and transparency: make statuses, deadlines, and responsibilities obvious.
- Consistency with Zoho Books’ existing design language (clean, data-dense but readable).

***

## 2. Deliverables

Create the following in Figma:

1. **User flows** (as frames or a flow diagram):
   - Enable tax-return filing.
   - Configure nexus and tax forms.
   - Sign FPOA.
   - Generate and file a return (normal path).
   - Add adjustment and re-approve.
   - Handle errors and manual filing.

2. **Key screens** (desktop-first, responsive considerations noted):
   - Tax Returns settings overview.
   - Enable connection screen.
   - Nexus management screen.
   - Tax-form configuration per state.
   - FPOA signing screen.
   - Returns dashboard (list of returns by state and period).
   - Return detail page (summary, adjustments, status timeline, activity log).
   - Error states and empty states.

3. **Components and states**:
   - Status badges (Not generated, Ready for review, Adjustment needed, Approved, Filing in progress, Filed, Error, Manually filed).
   - Return cards/rows with key fields.
   - Stepper / timeline component for return status.
   - Adjustment form component.
   - FPOA signing widget placeholder.
   - Notification banners (deadline warnings, auto-file warnings).

4. **Microcopy and helper text**:
   - Inline explanations for terms like “nexus”, “FPOA”, “filing frequency”.
   - Error messages and recovery guidance.
   - Confirmation dialogs for critical actions (approve, lock, deregister nexus).

Organize the Figma file with clear pages:
- `01_Flows`
- `02_Screens`
- `03_Components`
- `04_Copy_and_States`

***

## 3. User Flows to Design

Design the following flows as annotated frames or a flow diagram:

### Flow A: Enable Tax-Return Filing

**Starting point:** Settings → Taxes → Sales Tax Returns.

**Steps:**

1. User sees “Sales Tax Return Filing” section with:
   - Short description.
   - Toggle or CTA: “Enable Sales Tax Return Filing”.

2. **After enabling**, show a **pop-up** with a checkbox question:

   **Checkbox label:**  
   “Sign in with Avalara”

   - If the user **checks** this box:
     - Proceed to Avalara authentication flow (simulate this as a step).
   - If the user **does not check** this box:
     - Zoho will create/manage an Avalara account on their behalf.

3. **If “Sign in with Avalara” is enabled**:

   Show a pop-up that asks:

   > “Can we use this Avalara account for sales tax automation as well?”

   - Options:
     - **Yes, use this account for sales tax automation.**
     - **No, use this account only for tax filing.**

4. **If the user already has an Avalara account**:

   Show a pop-up that asks:

   > “Can we use the same Avalara account for tax filing as well?”

   - Options:
     - **Yes, use my existing account.**
     - **No, create a new Avalara account for tax filing.**

5. **If the user does not have an Avalara account (new sign-up)**:

   - Show option to **create a new Avalara account**.
   - Explain that Zoho will manage this account on their behalf.

6. On success:
   - Show status: “Connected to Avalara”.
   - Next step CTA: “Configure where you file”.

**Edge cases to show:**

- Connection failure with retry.
- Existing Avalara account used in another Zoho org (warning about shared configuration).

***

### Flow B: Configure Nexus and Tax Forms

**Starting point:** After enabling, or from Settings → Taxes → Sales Tax Returns → “Configure filing locations”.

**Steps:**

1. Show list of current nexus (states/provinces):
   - For each: state name, status, filing frequency, next due date.
   - CTA: “Add nexus”.

2. Add nexus:
   - Search/select state.
   - Optional: show “Suggested states based on your sales” (if historical data exists).

3. For each nexus, configure:
   - Filing frequency (Monthly/Quarterly/Annually).
   - Filing method (eFile/Web upload/Manual).
   - Tax form fields (auto-filled where possible).
   - Business details (legal name, EIN, etc.).

4. Save configuration per state.
5. Once all required fields are complete, enable “Submit configuration for review”.

**Edge cases:**

- Adding a new nexus after already filing in other states.
- Deregistering a nexus (confirmation dialog, impact explanation).
- Changing filing frequency with in-progress returns (warning).

***

### Flow C: Sign FPOA (Funding Power of Attorney)

**Starting point:** After tax-form configuration, or from Settings → Taxes → Sales Tax Returns → FPOA section.

**Steps:**

1. Explain FPOA in plain language:
   - “This authorizes Avalara to withdraw tax amounts from your account and pay the state on your behalf.”

2. Show who can sign (role-based).

3. **CTA: “Sign FPOA”**

   - On click, **open the FPOA document in an iframe** within a modal or dedicated panel.
   - The iframe contains:
     - The FPOA document.
     - A **digital signature field**.
     - Submit/Sign button.

4. **FPOA Status States:**

   - **Not signed:** Initial state before user clicks “Sign FPOA”.
   - **Processing:** After user signs, show “Processing” status until verification is complete.
   - **Verified / Signed:** Once Avalara confirms the signature.
   - **Failed / Needs re-signing:** If verification fails.

5. **Important behavior:**

   - Until the FPOA is **verified**, the status must remain **“Processing”**.
   - Disable “Submit configuration for review” until FPOA status is **Verified**.
   - Show a clear message:  
     “Your FPOA is being verified. This may take a few minutes.”

6. Once verified:
   - Status changes to “Signed”.
   - Enable “Submit configuration for review”.

**Edge cases:**

- Signer not in Zoho Books (external email flow as fallback).
- FPOA expiration or invalidation (re-sign flow).
- Iframe loading error (show fallback: “Open in new window” option).

***

### Flow D: Generate and File a Return (Normal Path)

**Starting point:** Taxes → Sales Tax Returns dashboard.

**Steps:**

1. Dashboard shows returns by state and period:
   - State, period, due date, tax due, status badge.

2. User clicks “Generate” on a return (e.g., Texas – Q1 2025).

3. Show:
   - Period covered.
   - Number of transactions to import.

4. Import progress:
   - “Importing 1,200 transactions…”
   - Allow user to leave and come back.

5. On completion:
   - Status: “Ready for review”.
   - Notification/in-app alert.

6. Return detail page:
   - Summary: total sales, taxable sales, tax collected, tax due.
   - Optional drill-down by tax type.

7. If numbers are correct:
   - CTA: “Lock and Approve”.
   - Confirmation modal with summary and warning about locking transactions.

8. After approval:
   - Status: “Approved – Filing in progress”.
   - Timeline shows: Imported → Ready for review → Approved → Preparing to file → Filed.

9. When filed:
   - Show confirmation number, date filed, amount paid.
   - Option to download/print confirmation.

**Edge cases:**

- Import failures (partial success, error details, retry).
- Very large transaction volumes (async behavior, notifications).

***

### Flow E: Add Adjustment and Re-Approve

**Starting point:** Return detail page, during review.

**Steps:**

1. User notices incorrect tax amount.
2. CTA: “Add adjustment”.
3. Form:
   - Reason (dropdown + free text).
   - Amount (positive/negative).
   - Optional reference.
4. Show impact:
   - Old tax due vs new tax due.
5. Allow multiple adjustments, with a list summary.
6. After adjustments, user clicks “Lock and Approve” again.
7. Show updated status and timeline.

**Edge cases:**

- Adjustment after approval but before filing (controlled “undo approval” or “request change” flow).
- Multiple users adding adjustments (show who added what in activity log).

***

### Flow F: Handle Errors and Manual Filing

**Starting point:** Returns dashboard or return detail page.

**Error path:**

1. Return status: “Filing failed” or “Error”.
2. Show:
   - Human-readable error reason.
   - Suggested action (Retry, Contact support, Fix data).
3. Provide CTA: “Retry filing” or “Regenerate return”.

**Manual filing path:**

1. CTA: “Mark as manually filed”.
2. Form:
   - Date filed.
   - Amount paid.
   - Reference number.
   - Optional attachment.
3. Status changes to “Manually filed”.
4. Return remains visible in dashboard for completeness.

***

## 4. Key Screens to Design

Design the following screens with realistic sample data:

1. **Tax Returns Settings Overview**
   - Section for enabling filing.
   - Connection status.
   - Quick links: Configure nexus, FPOA status, Returns dashboard.

2. **Enable Connection Screen**
   - Explanation of what happens.
   - Checkbox: “Sign in with Avalara”.
   - Pop-up dialogs for:
     - Using existing account for automation.
     - Using existing account for filing.
     - Creating new account.

3. **Nexus Management Screen**
   - List of states with status, frequency, due dates.
   - Add/Edit/Deregister actions.
   - Suggested states panel (if applicable).

4. **Tax-Form Configuration Screen (per state)**
   - Auto-filled fields.
   - Required fields highlighted.
   - Save and submit states.

5. **FPOA Signing Screen**
   - Explanation text.
   - CTA: “Sign FPOA”.
   - Modal with iframe showing FPOA document and digital signature field.
   - Status indicators: Not signed, Processing, Verified, Failed.

6. **Returns Dashboard**
   - Table or card list of returns.
   - Filters: state, status, date range.
   - Status badges, due dates, tax due amounts.
   - Empty state (no returns yet).

7. **Return Detail Page**
   - Summary section (sales, tax due, period, state).
   - Adjustments section (list + add).
   - Status timeline/stepper.
   - Activity log / comments.
   - Payment and confirmation details (once filed).

8. **Error and Empty States**
   - Connection error.
   - Import error.
   - Filing error.
   - No returns yet.
   - No nexus configured.

***

## 5. Components and States to Create

Design reusable components with variants:

1. **Status Badge**
   - Variants: Not generated, Ready for review, Adjustment needed, Approved, Filing in progress, Filed, Error, Manually filed.
   - Include color, icon, and label.

2. **Return Card / Row**
   - Fields: state, period, due date, tax due, status, last updated.
   - Hover/active states.
   - Expanded state (for key details).

3. **Status Timeline / Stepper**
   - Steps: Imported, Ready for review, Approved, Preparing to file, Filed.
   - Variants: current step, completed, error.

4. **Adjustment Form**
   - Fields: reason, amount, reference.
   - Validation states (error, success).
   - Summary of adjustments.

5. **FPOA Widget / Iframe Container**
   - Frame representing embedded FPOA document in iframe.
   - Digital signature field.
   - States: loading, ready for signing, processing, verified, failed.

6. **Notification Banners**
   - Deadline warning: “Your Texas Q2 return will be automatically filed on July 10 if you do not review it.”
   - Error banner: “We couldn’t connect to Avalara right now.”
   - Info banner: “New nexus available to configure.”

7. **Pop-up / Modal Dialogs**
   - “Sign in with Avalara” checkbox prompt.
   - “Can we use this account for sales tax automation as well?”
   - “Can we use the same Avalara account for tax filing as well?”
   - “Create new Avalara account” option.

***

## 6. Microcopy and Helper Text Guidelines

Use plain, non-technical language. Examples:

- **Nexus explanation:**  
  “Nexus: States where your business has tax obligations.”

- **FPOA explanation:**  
  “Funding Power of Attorney (FPOA): This authorizes Avalara to withdraw tax amounts from your account and pay the state on your behalf.”

- **Checkbox label:**  
  “Sign in with Avalara”

- **Pop-up question (existing account):**  
  “Can we use the same Avalara account for tax filing as well?”

- **Pop-up question (new account):**  
  “Can we use this Avalara account for sales tax automation as well?”

- **Deadline warning:**  
  “Your Texas Q2 return must be reviewed by July 10. After this date, it may be filed automatically.”

- **FPOA processing message:**  
  “Your FPOA is being verified. This may take a few minutes.”

- **Error message example:**  
  “We couldn’t file your return. Reason: Invalid tax ID format. Check your tax form settings and try again.”

- **Confirmation dialog (approve):**  
  “Once approved, transactions for this period will be locked. You can still make adjustments later, but they will be tracked separately.”

Include these microcopy examples directly in the Figma frames (as text layers or notes).

***

## 7. Role-Based and Permission Considerations

Design UI states for different roles:

- **Admin:**
  - Can enable/disable filing.
  - Can configure nexus and forms.
  - Can sign FPOA.
  - Can approve returns.

- **Accountant:**
  - Can configure forms (if allowed).
  - Can add adjustments.
  - Can review returns.
  - May or may not be allowed to approve (design both variants).

- **Viewer:**
  - Can see returns and status.
  - Cannot edit or approve.

Show how the UI changes:

- Disabled buttons with tooltips: “Only admins can configure filing locations.”
- Role-based banners: “You’re viewing this as an accountant. Approval requires an admin.”

***

## 8. Accessibility and Clarity Requirements

- Ensure sufficient color contrast for status badges and text.
- Use clear, legible typography (consistent with Zoho Books’ style).
- Provide focus states for interactive elements.
- Avoid relying solely on color to convey status (use icons and labels).
- Keep sentences short and scannable.
- Use tooltips or info icons for terms like “nexus”, “FPOA”, “filing frequency”.

***

## 9. Organization and Handoff

In Figma:

- Use auto-layout for components and screens.
- Name layers and frames clearly (e.g., `ReturnsDashboard/Table/Row_Default`).
- Use variants for component states.
- Add notes where behavior is complex (e.g., adjustment logic, auto-file warnings, FPOA verification flow).
- Prepare a simple handoff note summarizing:
  - Key flows.
  - Component usage.
  - Role-based behaviors.
  - Edge cases to discuss with engineering.

***

Use this prompt as your design brief. Your output should be a **complete, coherent Figma file** that a product manager and engineering team can use to implement the Sales Tax Return Filing feature with Avalara in Zoho Books.