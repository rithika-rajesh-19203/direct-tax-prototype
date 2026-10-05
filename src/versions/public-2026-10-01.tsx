import React, { useState, useRef } from 'react'
// Frozen snapshot of the build published at https://rithika-rajesh-19203.github.io/direct-tax-prototype/
// (commit c7aace7, 2026-10-01). Only change: the header slot for the version switcher.
import { NAV_TREE, TAX_NAV_TABS } from '../app/data/navigation'

/**
 * Canonical version of the Direct Tax Settings app.
 * Complete workflow replication from deployed v1.0 with:
 * - Avalara connection modal
 * - FPOA signing wizard (2-step: Sign FPOA → Tax Return)
 * - Tax return configuration page (in-page) with nexus regions
 * - All states, transitions, and interactions
 */

type AppPage = 'overview' | 'wizard' | 'summary'
type SetupWizardStep = 1 | 2
type FpoaStatus = 'idle' | 'signing' | 'processing'

interface FilingSetup {
  id: string
  savedAt: Date
  rows: NexusRow[]
  questionnaire: QuestionnaireAnswers | null
}

interface NexusRow {
  id: string
  state: string
  stateCode: string
  forms: string[]
}

const DIRECT_TAX_CARD_BENEFITS = [
  'Select regions for which direct tax needs to be filed',
  'Select necessary forms listed for each region',
  'Effortlessly file direct taxes',
  'Stay compliant as you expand your sales to more states',
  "Get accurate calculations based on what you sell, where you sell, and where you're registered",
]

// Regions already set up in the Tax Registration tab.
const REGISTERED_REGIONS = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
]

type EntityType = 'corporation' | 'llc' | 'partnership' | 'sole-proprietorship'

interface QuestionnaireAnswers {
  nexus: string[]
  entity: EntityType | ''
  presence: string[]
  receipts: '' | 'under-100k' | '100k-1m' | 'over-1m'
  fiscalYearEnd: string
}

const EMPTY_ANSWERS: QuestionnaireAnswers = {
  nexus: [],
  entity: '',
  presence: [],
  receipts: '',
  fiscalYearEnd: '',
}

const SAMPLE_ANSWERS: QuestionnaireAnswers = {
  nexus: ['AL', 'AZ', 'CA', 'NY'],
  entity: 'corporation',
  presence: ['CA', 'NY'],
  receipts: 'over-1m',
  fiscalYearEnd: 'December',
}

const ENTITY_OPTIONS: { value: EntityType; label: string; hint: string }[] = [
  { value: 'corporation', label: 'Corporation', hint: 'C corp or S corp' },
  { value: 'llc', label: 'LLC', hint: 'Limited liability company' },
  { value: 'partnership', label: 'Partnership', hint: 'General or limited' },
  { value: 'sole-proprietorship', label: 'Sole proprietorship', hint: 'Single owner, unincorporated' },
]

const RECEIPTS_OPTIONS: { value: QuestionnaireAnswers['receipts']; label: string }[] = [
  { value: 'under-100k', label: 'Under $100K' },
  { value: '100k-1m', label: '$100K – $1M' },
  { value: 'over-1m', label: 'Over $1M' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Illustrative form mapping for the prototype — not a filing reference.
const ENTITY_FORMS: Record<EntityType, Record<string, string[]>> = {
  corporation: { AL: ['AL Form 20C', 'AL BPT-IN'], AZ: ['AZ Form 120'], CA: ['CA Form 100'], NY: ['NY CT-3'] },
  llc: { AL: ['AL Form 65', 'AL BPT-IN'], AZ: ['AZ Form 165'], CA: ['CA Form 568'], NY: ['NY IT-204'] },
  partnership: { AL: ['AL Form 65'], AZ: ['AZ Form 165'], CA: ['CA Form 565'], NY: ['NY IT-204'] },
  'sole-proprietorship': { AL: ['AL Form 40'], AZ: ['AZ Form 140'], CA: ['CA Form 540'], NY: ['NY IT-201'] },
}
const WITHHOLDING_FORMS: Record<string, string> = { AL: 'AL A-1', AZ: 'AZ A1-QRT', CA: 'CA DE 9', NY: 'NY-45' }
const ESTIMATED_FORMS: Record<string, string> = { AL: 'AL Form 2220AL', AZ: 'AZ Form 120ES', CA: 'CA Form 100-ES', NY: 'NY CT-400' }

// Every form the prototype knows for a region — what "Add form" offers.
interface TaxForm {
  name: string
  description: string
}

const ENTITY_FORM_LABEL: Record<EntityType, string> = {
  corporation: 'Corporate income tax return',
  llc: 'LLC income tax return',
  partnership: 'Partnership return',
  'sole-proprietorship': 'Individual income tax return',
}

function formsForRegion(code: string): TaxForm[] {
  const forms: TaxForm[] = []
  const add = (name: string, description: string) => {
    if (!forms.some((f) => f.name === name)) forms.push({ name, description })
  }
  for (const [entity, byRegion] of Object.entries(ENTITY_FORMS) as [EntityType, Record<string, string[]>][]) {
    for (const name of byRegion[code] ?? []) {
      add(name, name.includes('BPT') ? 'Business privilege tax return' : ENTITY_FORM_LABEL[entity])
    }
  }
  add(WITHHOLDING_FORMS[code], 'Employer withholding return')
  add(ESTIMATED_FORMS[code], 'Estimated tax payment')
  return forms
}

function suggestNexusRows(answers: QuestionnaireAnswers): NexusRow[] {
  return REGISTERED_REGIONS.filter((r) => answers.nexus.includes(r.code)).map((r) => ({
    id: r.code,
    state: r.name,
    stateCode: r.code,
    forms: [
      ...(answers.entity ? ENTITY_FORMS[answers.entity][r.code] : []),
      ...(answers.presence.includes(r.code) ? [WITHHOLDING_FORMS[r.code]] : []),
      ...(answers.receipts === 'over-1m' ? [ESTIMATED_FORMS[r.code]] : []),
    ],
  }))
}

const DEFAULT_NEXUS_ROWS: NexusRow[] = REGISTERED_REGIONS.map((r) => ({
  id: r.code,
  state: r.name,
  stateCode: r.code,
  forms: [],
}))

// ─── Shared control styles ────────────────────────────
// One size for every CTA (32px, 14px medium) and one style for every link.
const BTN_BASE =
  'inline-flex h-8 flex-shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed'
const BTN_PRIMARY = `${BTN_BASE} px-4 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-600/40`
const BTN_SECONDARY = `${BTN_BASE} px-4 border border-gray-300 bg-white text-gray-700 hover:bg-gray-100`
const BTN_GHOST = `${BTN_BASE} px-3 text-gray-700 hover:bg-gray-100`
const BTN_ICON =
  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600'
const LINK =
  'inline-flex flex-shrink-0 items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline'
const LINK_SM =
  'inline-flex flex-shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline'

// ─── Navigation Component ─────────────────────────────
function NavTree() {
  return (
    <nav className="p-4 space-y-6">
      {NAV_TREE.map((section, idx) => (
        <div key={idx}>
          {section.heading && (
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">
              {section.heading}
            </p>
          )}
          <div className="space-y-1">
            {section.items.map((item) => (
              <div key={item.label}>
                <button className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  item.active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}>
                  {item.label}
                </button>
                {item.children && item.expanded && (
                  <div className="pl-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.label}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                          child.active
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

// ─── Avalara Modal ────────────────────────────────────
function AvalaraModal({
  onConnect,
  onCancel,
}: {
  onConnect: () => void
  onCancel: () => void
}) {
  const [understood, setUnderstood] = useState(false)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avalara-title"
        className="bg-white w-full max-w-[480px] max-h-[86vh] overflow-hidden border border-gray-200 rounded-xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-200">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-blue-600" aria-hidden="true">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="avalara-title" className="text-base font-semibold text-gray-900 leading-6">
              Connect to Avalara
            </h2>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              Avalara automates tax filing so you can stay compliant without the manual overhead.
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className={`-mr-2 -mt-1 ${BTN_ICON}`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-5 flex-1 overflow-y-auto space-y-4">
          {/* Info Box */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 fill-amber-600" aria-hidden="true">
                <path d="M12 2 1 21h22L12 2Zm1 14h-2v-2h2v2Zm0-4h-2V8h2v4Z" />
              </svg>
              <p className="text-sm font-medium text-amber-800">Before you proceed</p>
            </div>
            <ul className="mt-2.5 ml-6 space-y-2 list-disc marker:text-amber-500">
              <li className="text-sm leading-5 text-gray-700">
                Zoho Books supports direct tax filing through its integration with Avalara, our certified service provider.
              </li>
              <li className="text-sm leading-5 text-gray-700">
                Avalara handles tax compliance and filing on your behalf so you can focus on your business.
              </li>
            </ul>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded accent-blue-600 cursor-pointer"
            />
            <span className="text-sm leading-5 text-gray-700">
              I agree to the terms of Zoho Books and Avalara and wish to proceed with the connection.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-2 bg-gray-50">
          <button
            onClick={onConnect}
            disabled={!understood}
            className={BTN_PRIMARY}
          >
            Proceed
          </button>
          <button
            onClick={onCancel}
            className={BTN_SECONDARY}
          >
            Cancel
          </button>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2Zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2Zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2Z" />
            </svg>
            Secure connection
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FPOA Document Modal ──────────────────────────────
const FPOA_DOCUMENT_HTML = `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  body { margin: 0; background: #eef1f6; font-family: Inter, "Segoe UI", sans-serif; color: #1d2736; }
  .page { max-width: 720px; margin: 24px auto; background: #fff; padding: 48px 56px; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { font-size: 12px; color: #66718a; margin: 0 0 24px; }
  h2 { font-size: 13px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: .04em; color: #66718a; }
  p, li { font-size: 13px; line-height: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { border: 1px solid #e7ebf2; padding: 8px 10px; }
  td:first-child { width: 40%; color: #66718a; background: #f8fafc; }
  .sign { margin-top: 32px; border: 1px dashed #b8c2d3; border-radius: 6px; padding: 16px; font-size: 12px; color: #66718a; height: 64px; }
</style></head><body><div class="page">
  <h1>Form POA — Funding Power of Attorney</h1>
  <p class="sub">Authorization for direct tax filing setup · Page 1 of 1</p>
  <h2>Taxpayer</h2>
  <table>
    <tr><td>Legal name</td><td>Zylker Inc.</td></tr>
    <tr><td>Country</td><td>Canada</td></tr>
    <tr><td>Tax identification number</td><td>XX-XXXXXXX</td></tr>
  </table>
  <h2>Authorized representative</h2>
  <table>
    <tr><td>Service provider</td><td>Avalara, Inc.</td></tr>
    <tr><td>Scope</td><td>Direct tax return preparation, filing and remittance</td></tr>
  </table>
  <h2>Authorization</h2>
  <p>The taxpayer authorizes the representative named above to file direct tax returns and to debit the taxpayer's designated account for the tax amounts due, on the taxpayer's behalf, for each nexus region configured in Zoho Books.</p>
  <ul>
    <li>This authorization remains in effect until revoked in writing.</li>
    <li>The taxpayer remains responsible for the accuracy of the information provided.</li>
  </ul>
  <div class="sign">Digital signature</div>
</div></body></html>`

function FpoaDocumentModal({
  signed,
  onSign,
  onClose,
}: {
  signed: boolean
  onSign: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fpoa-doc-title"
        className="bg-white w-full max-w-4xl h-[88vh] overflow-hidden border border-gray-200 rounded-xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 id="fpoa-doc-title" className="text-base font-semibold text-gray-900 truncate">
              FPOA_Zylker_Canada.pdf
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {signed ? 'Signed document' : 'Review the document, then sign it digitally.'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`-mr-2 ${BTN_ICON}`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Document */}
        <iframe
          title="FPOA document"
          srcDoc={FPOA_DOCUMENT_HTML}
          className="flex-1 w-full border-0 bg-gray-100"
        />

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-2 bg-gray-50">
          {!signed && (
            <button
              onClick={onSign}
              className={BTN_PRIMARY}
            >
              Sign document
            </button>
          )}
          <button
            onClick={onClose}
            className={BTN_SECONDARY}
          >
            {signed ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Questionnaire Modal ──────────────────────────────
// A selectable tile: the native input stays for keyboard and screen readers,
// and `has-checked` paints the selected state on the whole tile.
const TILE =
  'relative flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:border-gray-300 has-checked:border-blue-600 has-checked:bg-blue-50 has-focus-visible:ring-2 has-focus-visible:ring-blue-200'

function QuestionCard({
  number,
  title,
  hint,
  required,
  answered,
  children,
}: {
  number: number
  title: string
  hint?: string
  required?: boolean
  answered: boolean
  children: React.ReactNode
}) {
  return (
    <fieldset className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-px flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            answered ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
          aria-hidden="true"
        >
          {answered ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          ) : (
            number
          )}
        </span>
        <div className="min-w-0 flex-1">
          <legend className="text-sm font-medium text-gray-900">
            {title}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </legend>
          {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </fieldset>
  )
}

function QuestionnaireModal({
  initialAnswers,
  onSubmit,
  onClose,
}: {
  initialAnswers: QuestionnaireAnswers
  onSubmit: (answers: QuestionnaireAnswers) => void
  onClose: () => void
}) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initialAnswers)
  const canSubmit = answers.nexus.length > 0 && answers.entity !== ''

  const toggle = (key: 'nexus' | 'presence', code: string) =>
    setAnswers((prev) => {
      const list = prev[key].includes(code) ? prev[key].filter((c) => c !== code) : [...prev[key], code]
      // A physical presence only counts in a region you have nexus in.
      return key === 'nexus'
        ? { ...prev, nexus: list, presence: prev.presence.filter((c) => list.includes(c)) }
        : { ...prev, presence: list }
    })

  const nexusRegions = REGISTERED_REGIONS.filter((r) => answers.nexus.includes(r.code))
  const answered = [
    answers.nexus.length > 0,
    answers.entity !== '',
    answers.presence.length > 0,
    answers.receipts !== '',
    answers.fiscalYearEnd !== '',
  ]
  const answeredCount = answered.filter(Boolean).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="questionnaire-title"
        className="bg-white w-full max-w-[640px] max-h-[90vh] overflow-hidden border border-gray-200 rounded-xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-200">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-blue-600" aria-hidden="true">
                <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Zm-2 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="questionnaire-title" className="text-base font-semibold text-gray-900 leading-6">
                  Tax questionnaire
                </h2>
                <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                  Optional
                </span>
              </div>
              <p className="mt-1 text-sm leading-5 text-gray-600">
                Tell us about your registered regions and we'll suggest the tax forms to file for each nexus.
              </p>
            </div>
            <button onClick={onClose} aria-label="Close" className={`-mr-2 -mt-1 ${BTN_ICON}`}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${(answeredCount / answered.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 tabular-nums">
              {answeredCount} of {answered.length} answered
            </span>
          </div>
        </div>

        {/* Autofill banner */}
        <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 px-6 py-2.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 fill-blue-600" aria-hidden="true">
            <path d="M7.5 5.6 10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7l2.5-1.4Zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14l-2.5 1.4ZM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5L22 2Zm-7.63 5.29a.996.996 0 0 0-1.41 0L1.29 18.96a.996.996 0 0 0 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05a.996.996 0 0 0 0-1.41l-2.33-2.35Zm-1.03 5.49-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44Z" />
          </svg>
          <p className="flex-1 text-xs text-blue-900">Prototyping? Fill in sample answers in one click.</p>
          <button onClick={() => setAnswers(SAMPLE_ANSWERS)} className={LINK_SM}>
            Autofill
          </button>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-5 space-y-3">
          <QuestionCard
            number={1}
            title="In which of your registered regions do you have nexus?"
            hint="Regions come from your Tax Registration settings."
            required
            answered={answered[0]}
          >
            <div className="grid grid-cols-2 gap-2">
              {REGISTERED_REGIONS.map((r) => (
                <label key={r.code} className={TILE}>
                  <input
                    type="checkbox"
                    checked={answers.nexus.includes(r.code)}
                    onChange={() => toggle('nexus', r.code)}
                    className="h-4 w-4 flex-shrink-0 rounded accent-blue-600"
                  />
                  <span className="text-sm text-gray-800">{r.name}</span>
                  <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">{r.code}</span>
                </label>
              ))}
            </div>
          </QuestionCard>

          <QuestionCard number={2} title="What is your business entity type?" required answered={answered[1]}>
            <div className="grid grid-cols-2 gap-2">
              {ENTITY_OPTIONS.map((o) => (
                <label key={o.value} className={TILE}>
                  <input
                    type="radio"
                    name="entity"
                    checked={answers.entity === o.value}
                    onChange={() => setAnswers((prev) => ({ ...prev, entity: o.value }))}
                    className="h-4 w-4 flex-shrink-0 accent-blue-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-800">{o.label}</span>
                    <span className="block text-xs text-gray-500">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </QuestionCard>

          <QuestionCard
            number={3}
            title="Where do you have a physical presence?"
            hint="An office, employees or inventory in the region."
            answered={answered[2]}
          >
            {nexusRegions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-xs text-gray-500">
                Select your nexus regions in question 1 first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {nexusRegions.map((r) => (
                  <label key={r.code} className={`${TILE} py-1.5`}>
                    <input
                      type="checkbox"
                      checked={answers.presence.includes(r.code)}
                      onChange={() => toggle('presence', r.code)}
                      className="h-4 w-4 flex-shrink-0 rounded accent-blue-600"
                    />
                    <span className="text-sm text-gray-800">{r.name}</span>
                  </label>
                ))}
              </div>
            )}
          </QuestionCard>

          <QuestionCard number={4} title="What were your gross receipts last fiscal year?" answered={answered[3]}>
            <div className="grid grid-cols-3 gap-2">
              {RECEIPTS_OPTIONS.map((o) => (
                <label key={o.value} className={`${TILE} justify-center`}>
                  <input
                    type="radio"
                    name="receipts"
                    checked={answers.receipts === o.value}
                    onChange={() => setAnswers((prev) => ({ ...prev, receipts: o.value }))}
                    className="h-4 w-4 flex-shrink-0 accent-blue-600"
                  />
                  <span className="text-sm text-gray-800">{o.label}</span>
                </label>
              ))}
            </div>
          </QuestionCard>

          <QuestionCard number={5} title="When does your fiscal year end?" answered={answered[4]}>
            <select
              aria-label="Fiscal year end month"
              value={answers.fiscalYearEnd}
              onChange={(e) => setAnswers((prev) => ({ ...prev, fiscalYearEnd: e.target.value }))}
              className={`block h-9 w-56 rounded-lg border border-gray-200 bg-white px-3 text-sm hover:border-gray-300 ${
                answers.fiscalYearEnd ? 'text-gray-800' : 'text-gray-400'
              }`}
            >
              <option value="" disabled>Select a month</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </QuestionCard>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-2 bg-white">
          <button onClick={() => onSubmit(answers)} disabled={!canSubmit} className={BTN_PRIMARY}>
            Save and suggest forms
          </button>
          <button onClick={onClose} className={BTN_SECONDARY}>
            Cancel
          </button>
          {!canSubmit && (
            <span className="ml-auto text-xs text-gray-500">Answer questions 1 and 2 to continue.</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Add Form Modal ───────────────────────────────────
function AddFormModal({
  region,
  existingForms,
  onAdd,
  onClose,
}: {
  region: { code: string; name: string }
  existingForms: string[]
  onAdd: (forms: string[]) => void
  onClose: () => void
}) {
  const catalog = formsForRegion(region.code)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = query.trim().toLowerCase()
  const options = catalog.filter(
    (f) => !q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
  )
  const isAdded = (name: string) => existingForms.includes(name)

  const toggle = (name: string) => {
    if (isAdded(name)) return
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
    setQuery('')
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open && options[activeIndex]) {
      e.preventDefault()
      toggle(options[activeIndex].name)
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'Backspace' && !query && selected.length) {
      setSelected((prev) => prev.slice(0, -1))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-form-title"
        className="bg-white w-full max-w-[520px] border border-gray-200 rounded-xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-200 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-600">
            {region.code}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="add-form-title" className="text-base font-semibold text-gray-900 leading-6">
              Add tax forms
            </h2>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              Choose the forms to file for {region.name}. You can select more than one.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className={`-mr-2 -mt-1 ${BTN_ICON}`}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <label htmlFor="form-search" className="text-sm font-medium text-gray-900">
            Tax forms
          </label>
          <div className="relative mt-2">
            {/* Combobox field: selected chips + search input */}
            <div
              onClick={() => {
                setOpen(true)
                inputRef.current?.focus()
              }}
              className={`flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 cursor-text ${
                open ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 fill-gray-400" aria-hidden="true">
                <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" />
              </svg>
              {selected.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                >
                  {name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(name)
                    }}
                    aria-label={`Remove ${name}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current" aria-hidden="true">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                id="form-search"
                ref={inputRef}
                role="combobox"
                aria-expanded={open}
                aria-controls="form-options"
                aria-autocomplete="list"
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setOpen(true)
                  setActiveIndex(0)
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={onKeyDown}
                placeholder={selected.length ? '' : 'Search or select a form'}
                className="min-w-24 flex-1 border-0 bg-transparent py-0.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus-visible:outline-none"
              />
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 flex-shrink-0 fill-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                aria-hidden="true"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>

            {/* Dropdown */}
            {open && (
              <ul
                id="form-options"
                role="listbox"
                aria-multiselectable="true"
                className="mt-1.5 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
              >
                {options.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-gray-500">No forms match "{query}".</li>
                ) : (
                  options.map((f, i) => {
                    const added = isAdded(f.name)
                    const checked = added || selected.includes(f.name)
                    return (
                      <li
                        key={f.name}
                        role="option"
                        aria-selected={checked}
                        aria-disabled={added}
                        // mousedown, not click, so the input keeps focus and the list stays open
                        onMouseDown={(e) => {
                          e.preventDefault()
                          toggle(f.name)
                        }}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`flex items-center gap-3 px-3 py-2 ${
                          added ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        } ${i === activeIndex && !added ? 'bg-gray-50' : ''}`}
                      >
                        <span
                          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                            checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'
                          }`}
                          aria-hidden="true"
                        >
                          {checked && (
                            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-gray-800">{f.name}</span>
                          <span className="block text-xs text-gray-500">{f.description}</span>
                        </span>
                        {added && <span className="text-xs text-gray-500">Added</span>}
                      </li>
                    )
                  })
                )}
              </ul>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {catalog.length} forms available for {region.name}
            {existingForms.length > 0 && ` · ${existingForms.length} already added`}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-2 bg-gray-50 rounded-b-xl">
          <button onClick={() => onAdd(selected)} disabled={selected.length === 0} className={BTN_PRIMARY}>
            {selected.length > 1 ? `Add ${selected.length} forms` : 'Add form'}
          </button>
          <button onClick={onClose} className={BTN_SECONDARY}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── FPOA Wizard (in-page) ────────────────────────────
function SetupWizardPage({
  wizardStep,
  fpoaStatus,
  nexusRows,
  questionnaire,
  onQuestionnaireSubmit,
  onNexusRowsChange,
  onFpoaSign,
  onNext,
  onSaveFilingSetup,
  onBack,
  editorMode = null,
}: {
  // Set when opened from the Direct Tax summary: a plain editor, not the first-run wizard.
  editorMode?: 'new' | 'existing' | null
  wizardStep: SetupWizardStep
  fpoaStatus: FpoaStatus
  nexusRows: NexusRow[]
  questionnaire: QuestionnaireAnswers | null
  onQuestionnaireSubmit: (answers: QuestionnaireAnswers) => void
  onNexusRowsChange: (rows: NexusRow[]) => void
  onFpoaSign: () => void
  onNext: () => void
  onSaveFilingSetup: () => void
  onBack: () => void
}) {
  const [showDocument, setShowDocument] = useState(false)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [addingFormFor, setAddingFormFor] = useState<string | null>(null)
  const [formAdded, setFormAdded] = useState(false)
  // The questionnaire is a starting point: once it is saved, or the user
  // starts adding forms by hand, it has done its job.
  const showQuestionnaireCard = !questionnaire && !formAdded

  const addForms = (rowId: string, forms: string[]) => {
    onNexusRowsChange(nexusRows.map((r) => (r.id === rowId ? { ...r, forms: [...r.forms, ...forms] } : r)))
    setFormAdded(true)
    setAddingFormFor(null)
  }

  const removeRow = (rowId: string) => onNexusRowsChange(nexusRows.filter((r) => r.id !== rowId))
  const removeForm = (rowId: string, form: string) =>
    onNexusRowsChange(nexusRows.map((r) => (r.id === rowId ? { ...r, forms: r.forms.filter((f) => f !== form) } : r)))
  const [showSigningModal, setShowSigningModal] = useState(false)
  const [fpoaSigned, setFpoaSigned] = useState(false)

  return (
    <div className="h-full bg-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {editorMode === 'new'
                  ? 'Add nexus setup'
                  : editorMode === 'existing'
                    ? 'Edit nexus setup'
                    : wizardStep === 1
                      ? 'Configure tax return'
                      : 'Configure tax return for your business'}
              </h3>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                {editorMode
                  ? 'Add the nexus regions for this setup and assign the eligible forms for each region.'
                  : wizardStep === 1
                    ? 'Complete the setup flow to sign the FPOA and configure tax returns for each nexus region.'
                    : 'Add as many nexus regions as you need and assign eligible forms for each region before moving to the configure nexus screen.'}
              </p>
            </div>
            <button onClick={onBack} className={LINK}>
              Back
            </button>
          </div>

          {/* Steps Indicator — first-run wizard only */}
          {!editorMode && (
          <div className="mt-5 flex items-center gap-4">
            {[1, 2].map((step) => {
              const active = wizardStep === step
              const completed = step < wizardStep
              return (
                <div key={step} className={`flex min-w-0 items-center ${step === 1 ? 'flex-1 gap-3' : 'flex-none gap-3'}`}>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                      completed
                        ? 'bg-blue-600 text-white'
                        : active
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-300'
                    }`}
                  >
                    {completed ? '✓' : step}
                  </div>
                  <div className="hidden sm:block text-xs text-gray-600">
                    {step === 1 ? 'Sign FPOA' : 'Tax return'}
                  </div>
                  {step < 2 && <div className="ml-1 h-px flex-1 bg-gray-300" />}
                </div>
              )
            })}
          </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50">
          {wizardStep === 1 ? (
            // Step 1: FPOA
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs text-gray-700">
                  Review and digitally sign your FPOA before you continue to tax return configuration.
                </p>
              </div>

              <div className="w-full rounded-lg border border-gray-300 bg-white p-4">
                <div className="flex min-h-96 flex-col">
                  {/* Document Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-gray-900">FPOA_Zylker_Canada.pdf</p>
                      <p className="text-xs text-gray-500 mt-0.5">Document preview</p>
                    </div>
                    <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-600">
                      Page 1 of 1
                    </span>
                  </div>

                  {/* Document Preview */}
                  <div className="relative flex-1 bg-gradient-to-b from-gray-100 to-gray-50 flex items-center justify-center">
                    <div className="flex h-full w-full flex-col bg-white px-8 py-7">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-5">
                        <div>
                          <div className="text-xs font-medium text-gray-900">Form POA</div>
                          <div className="text-xs text-gray-500 mt-1">Authorization for direct tax filing setup</div>
                        </div>
                        <div className="h-6 w-16 rounded-md bg-gray-100" />
                      </div>

                      <div className="flex-1">
                        <div className="space-y-3">
                          <div className="h-2 rounded-full bg-gray-200" />
                          <div className="h-2 w-11/12 rounded-full bg-gray-200" />
                          <div className="h-2 w-10/12 rounded-full bg-gray-200" />
                          <div className="h-2 w-9/12 rounded-full bg-gray-200" />
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="h-2 w-12 rounded-full bg-gray-300" />
                            <div className="mt-3 h-8 rounded-lg border border-dashed border-gray-300 bg-white" />
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="h-2 w-14 rounded-full bg-gray-300" />
                            <div className="mt-3 h-8 rounded-lg border border-dashed border-gray-300 bg-white" />
                          </div>
                        </div>

                        <div className="mt-auto h-16 rounded-lg border border-dashed border-gray-300 bg-blue-50 px-5 py-4">
                          <div className="text-xs uppercase tracking-wider text-gray-500">Digital signature</div>
                          <div className="mt-3 h-6 w-2/3 rounded-full bg-gradient-to-r from-blue-200 to-blue-100 opacity-60" />
                        </div>
                      </div>
                    </div>

                    {/* Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[2px] p-6 text-center">
                      {fpoaStatus === 'idle' && (
                        <>
                          <p className="text-sm text-gray-700">Review the document and add your digital signature.</p>
                          <button
                            onClick={() => setShowDocument(true)}
                            className={LINK}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                            Sign FPOA digitally
                          </button>
                        </>
                      )}
                      {fpoaStatus === 'signing' && (
                        <p className="text-sm text-gray-700">Applying your signature…</p>
                      )}
                      {fpoaStatus === 'processing' && (
                        <>
                          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                            FPOA signed successfully
                          </p>
                          <button
                            onClick={() => setShowDocument(true)}
                            className={LINK}
                          >
                            View signed document
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onNext}
                  className={BTN_PRIMARY}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            // Step 2: Tax Return Configuration
            <div className="space-y-4">
              {showQuestionnaireCard && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-blue-600" aria-hidden="true">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm0 16H5V5h14v14ZM7 7h10v2H7V7Zm0 4h10v2H7v-2Zm0 4h6v2H7v-2Z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900">
                          Tax questionnaire
                          <span className="ml-1.5 font-normal text-gray-500">(Optional)</span>
                        </p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          Answer a few questions about your registered regions to get tax form suggestions for each nexus.
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setShowQuestionnaire(true)} className={LINK_SM}>
                      Answer questionnaire
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-medium text-gray-900">Configure nexus and tax forms</h4>
                <p className="text-xs text-gray-600">
                  {questionnaire
                    ? "Based on your answers, we've suggested the nexus states and tax forms below. Review, modify, or add new nexus entries."
                    : showQuestionnaireCard
                      ? 'Add the tax forms to file for each of your registered regions, or answer the questionnaire to get suggestions.'
                      : 'Add the tax forms to file for each of your registered regions.'}
                </p>

                <div className="flex items-center gap-2">
                  {questionnaire && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs">
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                    Auto-suggested from your questionnaire
                  </div>
                  )}
                  <span className="text-xs text-gray-500">{nexusRows.length} nexus state{nexusRows.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2">
                  {nexusRows.map((row) => (
                    <div key={row.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                            {row.stateCode}
                          </div>
                          <span className="text-xs font-medium text-gray-800">{row.state}</span>
                        </div>
                        <button onClick={() => removeRow(row.id)} aria-label={`Remove ${row.state}`} className={`${BTN_ICON} hover:text-red-500`}>
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                      <div className="ml-10 flex flex-wrap items-center gap-1.5">
                        {row.forms.length === 0 && (
                          <span className="text-xs text-gray-500">No forms added yet.</span>
                        )}
                        {row.forms.map((form) => (
                          <span
                            key={form}
                            className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-600 text-xs px-2.5 py-0.5 rounded-full"
                          >
                            {form}
                            <button onClick={() => removeForm(row.id, form)} aria-label={`Remove ${form}`} className="text-blue-600 hover:text-blue-700">
                              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                              </svg>
                            </button>
                          </span>
                        ))}
                        <button onClick={() => setAddingFormFor(row.id)} className={LINK_SM}>
                          + Add form
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={onSaveFilingSetup}
                  className={BTN_PRIMARY}
                >
                  {editorMode ? 'Save setup' : 'Save filing setup'}
                </button>
              </div>
            </div>
          )}
        </div>

      {addingFormFor && (() => {
        const row = nexusRows.find((r) => r.id === addingFormFor)
        return row ? (
          <AddFormModal
            region={{ code: row.stateCode, name: row.state }}
            existingForms={row.forms}
            onAdd={(forms) => addForms(row.id, forms)}
            onClose={() => setAddingFormFor(null)}
          />
        ) : null
      })()}

      {showQuestionnaire && (
        <QuestionnaireModal
          initialAnswers={questionnaire ?? EMPTY_ANSWERS}
          onSubmit={(answers) => {
            onQuestionnaireSubmit(answers)
            setShowQuestionnaire(false)
          }}
          onClose={() => setShowQuestionnaire(false)}
        />
      )}

      {showDocument && (
        <FpoaDocumentModal
          signed={fpoaStatus !== 'idle'}
          onSign={() => {
            onFpoaSign()
            setShowDocument(false)
          }}
          onClose={() => setShowDocument(false)}
        />
      )}
    </div>
  )
}

// ─── Direct Tax Summary (after filing setup is saved) ─
function StatusPill({ tone, children }: { tone: 'success' | 'warning' | 'neutral'; children: React.ReactNode }) {
  const styles = {
    success: 'border-green-200 bg-green-50 text-green-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    neutral: 'border-gray-200 bg-gray-50 text-gray-600',
  }[tone]
  const dot = { success: 'bg-green-500', warning: 'bg-amber-500', neutral: 'bg-gray-400' }[tone]
  return (
    <span className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {children}
    </span>
  )
}

const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function DirectTaxSummary({
  fpoaStatus,
  setups,
  onFpoaSign,
  onAddSetup,
  onViewSetup,
}: {
  fpoaStatus: FpoaStatus
  setups: FilingSetup[]
  onFpoaSign: () => void
  onAddSetup: () => void
  onViewSetup: (id: string) => void
}) {
  const [showDocument, setShowDocument] = useState(false)
  const [expanded, setExpanded] = useState<string[]>([])
  const signed = fpoaStatus === 'processing'
  // One table row per nexus card, across every saved setup.
  const nexusEntries = setups.flatMap((setup) => setup.rows.map((row) => ({ setup, row })))
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="space-y-5 p-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-gray-900">Direct Tax</h1>
            <StatusPill tone="success">Connected to Avalara</StatusPill>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            Manage your power of attorney and the tax returns Avalara files for each nexus region.
          </p>
        </div>
      </div>

      {/* Sign FPOA */}
      <section
        aria-labelledby="fpoa-heading"
        className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4"
      >
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border ${
            signed ? 'border-green-200 bg-green-50 text-green-600' : 'border-amber-200 bg-amber-50 text-amber-600'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
            {signed ? (
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm-3.06 16L7.4 14.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L10.94 18ZM13 9V3.5L18.5 9H13Z" />
            ) : (
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm-1 15h-2v-2h2v2Zm0-4h-2V9h2v4Zm0-4V3.5L18.5 9H13Z" />
            )}
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 id="fpoa-heading" className="text-sm font-semibold text-gray-900">
              Form POA (Power of Attorney)
            </h2>
            {signed ? (
              <StatusPill tone="success">Signed</StatusPill>
            ) : fpoaStatus === 'signing' ? (
              <StatusPill tone="neutral">Processing</StatusPill>
            ) : (
              <StatusPill tone="warning">Pending</StatusPill>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-600">
            {signed
              ? 'Signed and processed. Avalara is authorized to file direct tax returns on your behalf.'
              : fpoaStatus === 'signing'
                ? 'Applying your signature…'
                : "Sign the FPOA so Avalara can file returns on your behalf. Returns won't be filed until it's signed."}
          </p>
        </div>
        {signed ? (
          <button onClick={() => setShowDocument(true)} className={BTN_SECONDARY}>
            View document
          </button>
        ) : fpoaStatus === 'idle' ? (
          <button onClick={() => setShowDocument(true)} className={BTN_PRIMARY}>
            Sign FPOA digitally
          </button>
        ) : null}
      </section>

      {/* Configure Tax Return */}
      <section aria-labelledby="tax-return-heading" className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="tax-return-heading" className="text-sm font-semibold text-gray-900">
                Tax return setups
              </h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums">
                {nexusEntries.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-600">
              Add nexus regions and manage the eligible forms for each nexus from one place.
            </p>
          </div>
          <button onClick={onAddSetup} className={BTN_PRIMARY}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Add nexus setup
          </button>
        </div>

        <table className="w-full text-left">
          <thead className="border-y border-gray-200 bg-gray-50">
            <tr>
              {['Nexus', 'Tax forms', 'Status'].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-5 py-2.5 text-xs font-medium text-gray-500">
                  {h}
                </th>
              ))}
              <th scope="col" className="whitespace-nowrap px-5 py-2.5 text-right text-xs font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {nexusEntries.map(({ setup, row }) => {
              const key = `${setup.id}:${row.id}`
              const isOpen = expanded.includes(key)
              const hasForms = row.forms.length > 0
              const panelId = `nexus-forms-${key}`
              const catalog = formsForRegion(row.stateCode)
              return (
                <React.Fragment key={key}>
                  <tr
                    onClick={() => hasForms && toggleExpanded(key)}
                    className={`transition-colors ${hasForms ? 'cursor-pointer hover:bg-gray-50' : ''} ${isOpen ? 'bg-gray-50' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {hasForms ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpanded(key)
                            }}
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            aria-label={`${isOpen ? 'Hide' : 'Show'} forms for ${row.state}`}
                            className="-ml-1.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className={`h-4 w-4 fill-current transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                              aria-hidden="true"
                            >
                              <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                            </svg>
                          </button>
                        ) : (
                          <span className="-ml-1.5 h-6 w-6 flex-shrink-0" aria-hidden="true" />
                        )}
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600">
                          {row.stateCode}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{row.state}</p>
                          <p className="whitespace-nowrap text-xs text-gray-500">Saved {formatDate(setup.savedAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="whitespace-nowrap text-sm text-gray-800 tabular-nums">
                        {row.forms.length} form{row.forms.length !== 1 ? 's' : ''}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      {hasForms ? (
                        <StatusPill tone="success">Configured</StatusPill>
                      ) : (
                        <StatusPill tone="warning">Needs forms</StatusPill>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewSetup(setup.id)
                        }}
                        className={`${LINK} whitespace-nowrap`}
                      >
                        View setup
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                          <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                        </svg>
                      </button>
                    </td>
                  </tr>

                  {/* Accordion: this state's forms, one per row */}
                  {hasForms && isOpen && (
                    <tr id={panelId} className="bg-gray-50">
                      <td colSpan={4} className="px-5 pb-4 pt-0">
                        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
                          {row.forms.map((form) => (
                            <li key={form} className="flex items-center gap-3 px-4 py-2.5">
                              <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 fill-gray-400" aria-hidden="true">
                                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Zm-3-5V3.5L18.5 9H13Z" />
                              </svg>
                              <span className="w-44 flex-shrink-0 text-sm text-gray-800">{form}</span>
                              <span className="text-xs text-gray-500">
                                {catalog.find((f) => f.name === form)?.description}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </section>

      {showDocument && (
        <FpoaDocumentModal
          signed={fpoaStatus !== 'idle'}
          onSign={() => {
            onFpoaSign()
            setShowDocument(false)
          }}
          onClose={() => setShowDocument(false)}
        />
      )}
    </div>
  )
}

// ─── Tax Sections List (Middle Column) ────────────────
const TAX_SECTIONS = [
  { id: 'tax-rates', label: 'Tax Rates' },
  { id: 'tax-exemptions', label: 'Tax Exemptions' },
  { id: 'tax-authorities', label: 'Tax Authorities' },
  { id: 'tax-registration', label: 'Tax Registration' },
  { id: 'tax-settings', label: 'Tax Settings' },
  { id: 'direct-tax', label: 'Direct Tax', icon: '⚡' },
  { id: 'tax-automation', label: 'Tax Automation Settings' },
]

// ─── Empty State Illustration ─────────────────────────
function DirectTaxEmptyIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden="true">
      {/* backdrop */}
      <ellipse cx="80" cy="104" rx="56" ry="8" fill="#EEF2F8" />
      <circle cx="80" cy="56" r="48" fill="#F1F6FF" />
      {/* back document */}
      <rect x="44" y="22" width="56" height="72" rx="6" fill="#FFFFFF" stroke="#D8E0EB" transform="rotate(-8 72 58)" />
      {/* front document */}
      <rect x="58" y="18" width="56" height="74" rx="6" fill="#FFFFFF" stroke="#C9D6EA" />
      <rect x="66" y="28" width="26" height="4" rx="2" fill="#0D81FD" />
      <rect x="66" y="38" width="40" height="3" rx="1.5" fill="#E2E8F0" />
      <rect x="66" y="45" width="34" height="3" rx="1.5" fill="#E2E8F0" />
      <rect x="66" y="52" width="38" height="3" rx="1.5" fill="#E2E8F0" />
      <rect x="66" y="66" width="18" height="16" rx="3" fill="#F1F6FF" />
      <text x="75" y="78" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0D81FD">%</text>
      <rect x="88" y="70" width="18" height="3" rx="1.5" fill="#E2E8F0" />
      <rect x="88" y="76" width="12" height="3" rx="1.5" fill="#E2E8F0" />
      {/* badge */}
      <circle cx="114" cy="84" r="13" fill="#0D81FD" />
      <path d="m108.5 84 3.8 3.8 7.2-7.6" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* sparkles */}
      <circle cx="40" cy="30" r="2.5" fill="#BFD6FF" />
      <circle cx="126" cy="30" r="3.5" fill="#BFD6FF" />
      <circle cx="132" cy="58" r="2" fill="#D8E0EB" />
    </svg>
  )
}

// ─── Main Screen Component ────────────────────────────
function DirectTaxSettings({
  onOpenSetup,
  setupPage,
}: {
  onOpenSetup: () => void
  setupPage?: React.ReactNode
}) {
  const [selectedSection, setSelectedSection] = useState<string>('direct-tax')

  return (
    <div className="flex h-full flex-1 min-w-0 gap-0">
      {/* Middle Column - Section List */}
      <div className="w-64 border-r border-gray-200 bg-white p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 px-2">Taxes</h2>
        <div className="space-y-1">
          {TAX_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedSection === section.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                {section.icon && <span>{section.icon}</span>}
                {section.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Column - Content Area */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {selectedSection === 'direct-tax' && setupPage}

        {selectedSection === 'direct-tax' && !setupPage && (
          <div className="space-y-6 p-6 h-full flex flex-col">
            {/* Configure Direct Tax — Empty State */}
            <div className="bg-white border border-gray-200 rounded-lg px-8 py-6">
              <div className="flex items-center gap-10">
                <div className="hidden flex-shrink-0 pl-4 md:block">
                  <DirectTaxEmptyIllustration />
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-semibold text-gray-900">Configure Direct Tax</h1>
                  <h2 className="mt-1 text-sm font-normal text-gray-600">
                    Set up automatic direct tax calculation by integrating with Zoho Books or Avalara.
                  </h2>

                  <ul className="mt-4 space-y-1.5">
                    {DIRECT_TAX_CARD_BENEFITS.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0 fill-blue-600" aria-hidden="true">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                        <span className="text-sm leading-5 text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <button onClick={onOpenSetup} className={`mt-5 ${BTN_PRIMARY}`}>
                    Set up Direct Tax
                  </button>
                </div>
              </div>
            </div>

            {/* Step-by-Step Setup Process */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Set up Direct Tax</h3>
              <p className="text-xs text-gray-600 mb-6">
                Follow these steps to configure your direct tax filing. Each step builds on the previous one to ensure proper setup.
              </p>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                    <span className="text-xs font-semibold text-gray-600">1</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h4 className="text-sm font-medium text-gray-900">Set up your business areas in the tax registration tab</h4>
                    <p className="mt-1 text-xs text-gray-600">
                      Define which regions or jurisdictions your business operates in and needs to file taxes.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                    <span className="text-xs font-semibold text-gray-600">2</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h4 className="text-sm font-medium text-gray-900">Configure/initiate direct tax</h4>
                    <p className="mt-1 text-xs text-gray-600">
                      Set up your direct tax configuration and choose your tax filing integration method.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                    <span className="text-xs font-semibold text-gray-600">3</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h4 className="text-sm font-medium text-gray-900">Sign the funding power of attorney</h4>
                    <p className="mt-1 text-xs text-gray-600">
                      Authorize your tax agent or filing service to handle direct tax submissions on your behalf.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                    <span className="text-xs font-semibold text-gray-600">4</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h4 className="text-sm font-medium text-gray-900">Add the tax forms and nexuses</h4>
                    <p className="mt-1 text-xs text-gray-600">
                      Select and configure the tax forms required for each of your business nexus locations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900">
                  Once all steps are complete, your direct tax configuration will be active and you can begin filing automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedSection !== 'direct-tax' && (
          <div className="bg-white border border-gray-200 p-6 rounded-lg m-6">
            <h2 className="text-base font-semibold text-gray-900">
              {TAX_SECTIONS.find((s) => s.id === selectedSection)?.label}
            </h2>
            <p className="text-sm text-gray-600 mt-4">
              This section is coming soon. Select "Direct Tax" to configure your tax settings.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── App Wrapper ──────────────────────────────────────
export default function AppCanonical({ headerSlot }: { headerSlot?: React.ReactNode } = {}) {
  const [appPage, setAppPage] = useState<AppPage>('overview')
  const [showAvalaraModal, setShowAvalaraModal] = useState(false)
  const [wizardStep, setWizardStep] = useState<SetupWizardStep>(1)
  const [fpoaStatus, setFpoaStatus] = useState<FpoaStatus>('idle')
  const [nexusRows, setNexusRows] = useState<NexusRow[]>(DEFAULT_NEXUS_ROWS)
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireAnswers | null>(null)
  const [filingSetups, setFilingSetups] = useState<FilingSetup[]>([])
  // Which saved setup the wizard is editing; null means a new one.
  const [editingSetupId, setEditingSetupId] = useState<string | null>(null)
  // null while the first filing setup goes through the wizard.
  const [editorMode, setEditorMode] = useState<'new' | 'existing' | null>(null)

  const openSetupEditor = (setup: FilingSetup | null) => {
    setEditingSetupId(setup?.id ?? null)
    setEditorMode(setup ? 'existing' : 'new')
    setNexusRows(setup?.rows ?? DEFAULT_NEXUS_ROWS)
    setQuestionnaire(setup?.questionnaire ?? null)
    setWizardStep(2)
    setAppPage('wizard')
  }

  const handleSaveFilingSetup = () => {
    const saved: FilingSetup = {
      id: editingSetupId ?? `setup-${Date.now()}`,
      savedAt: new Date(),
      rows: nexusRows,
      questionnaire,
    }
    setFilingSetups((prev) =>
      editingSetupId ? prev.map((s) => (s.id === editingSetupId ? saved : s)) : [...prev, saved],
    )
    setEditingSetupId(null)
    setAppPage('summary')
  }

  const handleWizardBack = () => {
    // Once a filing setup exists the summary is home; the intro cards never return.
    if (filingSetups.length > 0) {
      setEditingSetupId(null)
      setAppPage('summary')
      return
    }
    setAppPage('overview')
    setWizardStep(1)
    setFpoaStatus('idle')
    setQuestionnaire(null)
    setNexusRows(DEFAULT_NEXUS_ROWS)
  }

  const handleOpenSetup = () => {
    setShowAvalaraModal(true)
  }

  const handleAvalalaConnect = () => {
    setShowAvalaraModal(false)
    setAppPage('wizard')
    setWizardStep(1)
  }

  const handleFpoaSign = () => {
    setFpoaStatus('signing')
    setTimeout(() => setFpoaStatus('processing'), 2000)
  }

  const handleWizardNext = () => {
    if (wizardStep === 1) {
      setWizardStep(2)
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Left Navigation */}
      <div className="w-64 border-r border-gray-200 bg-white overflow-y-auto">
        <NavTree />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-gray-900">Direct Tax Settings</h1>
          <div className="flex items-center gap-2">
            {headerSlot}
            <button className={BTN_GHOST}>
              Help
            </button>
            <button className={BTN_GHOST}>
              Profile
            </button>
          </div>
        </div>

        {/* Page Content - Flex Container for 3-column layout */}
        <div className="flex-1 overflow-hidden flex">
          <DirectTaxSettings
            onOpenSetup={handleOpenSetup}
            setupPage={
              appPage === 'wizard' ? (
                <SetupWizardPage
                  editorMode={editorMode}
                  wizardStep={wizardStep}
                  fpoaStatus={fpoaStatus}
                  nexusRows={nexusRows}
                  questionnaire={questionnaire}
                  onQuestionnaireSubmit={(answers) => {
                    setQuestionnaire(answers)
                    setNexusRows(suggestNexusRows(answers))
                  }}
                  onNexusRowsChange={setNexusRows}
                  onFpoaSign={handleFpoaSign}
                  onNext={handleWizardNext}
                  onSaveFilingSetup={handleSaveFilingSetup}
                  onBack={handleWizardBack}
                />
              ) : appPage === 'summary' ? (
                <DirectTaxSummary
                  fpoaStatus={fpoaStatus}
                  setups={filingSetups}
                  onFpoaSign={handleFpoaSign}
                  onAddSetup={() => openSetupEditor(null)}
                  onViewSetup={(id) => openSetupEditor(filingSetups.find((s) => s.id === id) ?? null)}
                />
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Modals */}
      {showAvalaraModal && (
        <AvalaraModal
          onConnect={handleAvalalaConnect}
          onCancel={() => setShowAvalaraModal(false)}
        />
      )}

    </div>
  )
}
