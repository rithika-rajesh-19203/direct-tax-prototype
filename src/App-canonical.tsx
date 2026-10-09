import React, { useState, useRef, useEffect } from 'react'
import { NAV_TREE, TAX_NAV_TABS } from './app/data/navigation'

/**
 * Canonical version of the Direct Return Filing Settings app.
 * Complete workflow replication from deployed v1.0 with:
 * - Avalara connection modal
 * - FPOA signing wizard (2-step: Sign FPOA → Tax Return)
 * - Tax return configuration page (in-page) with nexus regions
 * - All states, transitions, and interactions
 */

type AppPage = 'overview' | 'active' | 'editor'
type DirectTaxSegment = 'fpoa' | 'forms'
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
  registeredOn?: string
}

interface TaxRegistration {
  id: string
  code: string
  name: string
  registeredOn: string // YYYY-MM-DD
  jurisdictions: { name: string; registeredOn: string }[]
}

const DIRECT_TAX_CARD_BENEFITS = [
  'Select regions for which direct tax needs to be filed',
  'Select necessary forms listed for each region',
  'Effortlessly file direct taxes',
  'Stay compliant as you expand your sales to more states',
  "Get accurate calculations based on what you sell, where you sell, and where you're registered",
]

// Regions already set up in the Tax Registration tab.
type Region = { code: string; name: string }

const US_STATES: Region[] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'],
  ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
  ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
  ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
  ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
].map(([code, name]) => ({ code, name }))

// Sample local jurisdictions for the prototype.
const LOCAL_JURISDICTIONS: Record<string, string[]> = {
  AL: ['ABBEVILLE PJ (AL - Special)', 'BIRMINGHAM (AL - City)', 'JEFFERSON COUNTY (AL - County)', 'MONTGOMERY (AL - City)'],
  AZ: ['PHOENIX (AZ - City)', 'TUCSON (AZ - City)', 'MARICOPA COUNTY (AZ - County)'],
  CA: ['LOS ANGELES COUNTY (CA - County)', 'SAN FRANCISCO (CA - City)', 'SAN DIEGO COUNTY (CA - County)'],
  CO: ['DENVER (CO - City)', 'BOULDER (CO - City)', 'EL PASO COUNTY (CO - County)'],
  NY: ['NEW YORK CITY (NY - City)', 'NASSAU COUNTY (NY - County)', 'ALBANY COUNTY (NY - County)'],
}
const jurisdictionsFor = (code: string) =>
  LOCAL_JURISDICTIONS[code] ?? [`${code} CITY DISTRICT (${code} - City)`, `${code} COUNTY DISTRICT (${code} - County)`]

// "2026-09-01" → "01 Sep 2026"
const formatIsoDate = (iso: string) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''
const todayIso = () => new Date().toISOString().slice(0, 10)

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

// Autofill: nexus in every registered state, a physical presence in the first two.
const sampleAnswers = (regions: Region[]): QuestionnaireAnswers => ({
  nexus: regions.map((r) => r.code),
  entity: 'corporation',
  presence: regions.slice(0, 2).map((r) => r.code),
  receipts: 'over-1m',
  fiscalYearEnd: 'December',
})

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
ENTITY_FORMS.corporation.CO = ['CO Form 112']
ENTITY_FORMS.llc.CO = ['CO Form 106']
ENTITY_FORMS.partnership.CO = ['CO Form 106']
ENTITY_FORMS['sole-proprietorship'].CO = ['CO Form 104']
WITHHOLDING_FORMS.CO = 'CO DR 1094'
ESTIMATED_FORMS.CO = 'CO Form 112EP'

// States without a hand-written mapping get placeholder form names.
const GENERIC_ENTITY_FORM: Record<EntityType, string> = {
  corporation: 'Form CIT',
  llc: 'Form LLC',
  partnership: 'Form PTE',
  'sole-proprietorship': 'Form IIT',
}
const entityFormsFor = (entity: EntityType, code: string) =>
  ENTITY_FORMS[entity][code] ?? [`${code} ${GENERIC_ENTITY_FORM[entity]}`]
const withholdingFormFor = (code: string) => WITHHOLDING_FORMS[code] ?? `${code} Form WH`
const estimatedFormFor = (code: string) => ESTIMATED_FORMS[code] ?? `${code} Form EST`

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
  for (const entity of Object.keys(ENTITY_FORMS) as EntityType[]) {
    for (const name of entityFormsFor(entity, code)) {
      add(name, name.includes('BPT') ? 'Business privilege tax return' : ENTITY_FORM_LABEL[entity])
    }
  }
  add(withholdingFormFor(code), 'Employer withholding return')
  add(estimatedFormFor(code), 'Estimated tax payment')
  return forms
}

// Forms the questionnaire suggests for one state.
function suggestFormsFor(answers: QuestionnaireAnswers, code: string): string[] {
  return [
    ...(answers.entity ? entityFormsFor(answers.entity, code) : []),
    ...(answers.presence.includes(code) ? [withholdingFormFor(code)] : []),
    ...(answers.receipts === 'over-1m' ? [estimatedFormFor(code)] : []),
  ]
}

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
// Compact buttons for small cards such as the setup checklist tiles.
const BTN_XS_BASE =
  'inline-flex h-7 flex-shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors'
const BTN_XS_PRIMARY = `${BTN_XS_BASE} bg-blue-600 text-white hover:bg-blue-700`
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
const AVALARA_LOGO_URL = `${import.meta.env.BASE_URL}brand/avalara-logo.svg`

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
          <div className="flex-1 min-w-0">
            <div className="mb-3 flex items-center gap-2.5">
              <img src={AVALARA_LOGO_URL} alt="Avalara" className="h-6 w-auto" />
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
                  <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8Z" />
                </svg>
                Certified partner
              </span>
            </div>
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
                Zoho Books supports direct return filing through its integration with Avalara, our certified service provider.
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

// ─── Bank account (pays the tax due on each return) ───
type BankAccount = {
  id: string
  bank: string
  name: string
  last4: string
  type: 'Checking' | 'Savings'
  routing: string
  accountNumber: string
}

// Accounts already in Zoho Books that can be associated.
const EXISTING_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'chase-4821', bank: 'Chase', name: 'Business Checking', last4: '4821', type: 'Checking', routing: '021000021', accountNumber: '000123454821' },
  { id: 'boa-0937', bank: 'Bank of America', name: 'Operating Account', last4: '0937', type: 'Checking', routing: '026009593', accountNumber: '004471200937' },
  { id: 'wf-1156', bank: 'Wells Fargo', name: 'Tax Reserve', last4: '1156', type: 'Savings', routing: '121000248', accountNumber: '009812341156' },
]

function BankAccountModal({
  current,
  onSave,
  onClose,
}: {
  current: BankAccount | null
  onSave: (account: BankAccount) => void
  onClose: () => void
}) {
  const [choice, setChoice] = useState<string>(current?.id ?? EXISTING_BANK_ACCOUNTS[0].id)
  const save = () => {
    const existing = EXISTING_BANK_ACCOUNTS.find((a) => a.id === choice)
    if (existing) onSave(existing)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-title"
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div>
            <h2 id="bank-title" className="text-base font-semibold text-gray-900">Connect a bank account</h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose the account you named on the FPOA. Avalara debits it to pay the tax due on each return; nothing is debited until a return is filed.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className={`-mr-2 -mt-1 ${BTN_ICON}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-6 pb-5">
          <p className="text-xs font-medium text-gray-500">Bank accounts in Zoho Books</p>
          {EXISTING_BANK_ACCOUNTS.map((a) => (
            <label key={a.id} className={TILE}>
              <input
                type="radio"
                name="bank-account"
                checked={choice === a.id}
                onChange={() => setChoice(a.id)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">{a.bank} · {a.name}</span>
                <span className="block text-xs text-gray-500">{a.type} ending in {a.last4}</span>
              </span>
            </label>
          ))}

          {/* Prototype: shown for completeness, not wired up */}
          <button type="button" className={`${LINK} pt-1`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Add a new bank account
          </button>
        </div>

        <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={save} className={BTN_PRIMARY}>
            {current ? 'Save bank account' : 'Connect bank account'}
          </button>
          <button onClick={onClose} className={BTN_SECONDARY}>
            Cancel
          </button>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2Zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2Zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2Z" />
            </svg>
            Encrypted
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── FPOA Document ────────────────────────────────────
// The real FPOA, served and signed through an Adobe Acrobat Sign web form.
const FPOA_ESIGN_URL =
  'https://secure.na1.echosign.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhBH-Mal45Altk9ZpKjo1B8NOnUohmFSu5uEpSq5mJoSsMUeQsbA0xUNvztdZHXKaaU*'
const ESIGN_ORIGIN = /^https:\/\/[\w.-]+\.(echosign|adobesign)\.com$/

// The FPOA opens in a large modal that hosts the Acrobat Sign document.
function FpoaSignModal({
  open,
  signed,
  signing,
  liveSession,
  onConfirmSigned,
  onClose,
}: {
  open: boolean
  signed: boolean
  signing: boolean
  // False when the FPOA was signed on an earlier visit: Adobe's session is gone.
  liveSession: boolean
  onConfirmSigned: () => void
  onClose: () => void
}) {
  return (
    <div className={`fixed inset-0 z-50 items-center justify-center bg-black/40 p-4 ${open ? 'flex' : 'hidden'}`}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fpoa-modal-title"
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-red-50 text-[10px] font-bold text-red-600">
              PDF
            </div>
            <div className="min-w-0">
              <h2 id="fpoa-modal-title" className="truncate text-sm font-semibold text-gray-900">
                Funding Power of Attorney (FPOA)
              </h2>
              <p className="text-xs text-gray-500">
                {signed ? 'Signed document' : 'Review and sign with Adobe Acrobat Sign'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a href={FPOA_ESIGN_URL} target="_blank" rel="noreferrer" className={`${LINK_SM} mr-2`}>
              Open in new tab
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7ZM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7Z" />
              </svg>
            </a>
            <button onClick={onClose} aria-label="Close" className={BTN_ICON}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {liveSession ? (
          <div className="flex min-h-0 flex-1">
            {/* Shown behind the frame until Acrobat Sign paints the document */}
            <div className="relative min-w-0 flex-1 bg-white">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" aria-hidden="true" />
                <p className="text-sm text-gray-600">Loading the FPOA from Adobe Acrobat Sign…</p>
                <p className="text-xs text-gray-500">
                  Not loading? Your browser may block embedded documents.{' '}
                  <a href={FPOA_ESIGN_URL} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    Open it in a new tab
                  </a>
                </p>
              </div>
              <iframe title="FPOA document — Adobe Acrobat Sign" src={FPOA_ESIGN_URL} className="relative h-full w-full border-0" />
            </div>
            {!signed && (
              <aside className="w-72 flex-shrink-0 overflow-y-auto border-l border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Taxpayer bank account</h3>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Enter the account Avalara should debit for the tax due. Use the same account in the Bank account step.
                </p>
              </aside>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-gray-50 p-8 text-center">
            <p className="text-sm font-medium text-gray-900">The signed FPOA is stored in Adobe Acrobat Sign</p>
            <p className="max-w-md text-sm text-gray-600">
              Adobe emailed the signed copy to the signer. You can also download it from your Acrobat Sign account.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-5 py-3">
          <p className="text-xs text-gray-600">
            {signed
              ? 'Signed. Avalara is authorized to file and pay direct taxes on your behalf.'
              : 'Fill in and sign the document above. This updates as soon as Acrobat Sign confirms your signature.'}
          </p>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button onClick={onClose} className={BTN_SECONDARY}>
              Close
            </button>
            {!signed && (
              <button onClick={onConfirmSigned} disabled={signing} className={BTN_PRIMARY}>
                {signing ? 'Confirming…' : "I've signed the document"}
              </button>
            )}
          </div>
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
  regions,
  initialAnswers,
  onSubmit,
  onClose,
}: {
  regions: Region[]
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

  const nexusRegions = regions.filter((r) => answers.nexus.includes(r.code))
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
          <button onClick={() => setAnswers(sampleAnswers(regions))} className={LINK_SM}>
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
              {regions.map((r) => (
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

  const q = query.trim().toLowerCase()
  const options = catalog.filter(
    (f) => !q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
  )
  const isAdded = (name: string) => existingForms.includes(name)
  const toggle = (name: string) => {
    if (isAdded(name)) return
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-form-title"
        className="bg-white w-full max-w-[520px] max-h-[88vh] border border-gray-200 rounded-xl shadow-2xl flex flex-col"
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

        {/* Body: search filters the list; the list is always visible */}
        <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
          <label htmlFor="form-search" className="sr-only">
            Search forms
          </label>
          <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-2.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 fill-gray-400" aria-hidden="true">
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" />
            </svg>
            <input
              id="form-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${catalog.length} forms for ${region.name}`}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 focus-visible:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="text-gray-400 hover:text-gray-600">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            )}
          </div>

          <ul
            aria-label={`Tax forms for ${region.name}`}
            className="mt-3 min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200"
          >
            {options.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-500">No forms match "{query}".</li>
            ) : (
              options.map((f) => {
                const added = isAdded(f.name)
                const checked = added || selected.includes(f.name)
                return (
                  <li key={f.name}>
                    <label
                      className={`flex items-center gap-3 px-3 py-2.5 ${
                        added ? 'cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50'
                      } ${checked && !added ? 'bg-blue-50/50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={added}
                        onChange={() => toggle(f.name)}
                        className="h-4 w-4 flex-shrink-0 accent-blue-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${added ? 'text-gray-500' : 'text-gray-900'}`}>{f.name}</span>
                        <span className="block text-xs text-gray-500">{f.description}</span>
                      </span>
                      {added && <span className="text-xs text-gray-500">Already added</span>}
                    </label>
                  </li>
                )
              })
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-2 bg-gray-50 rounded-b-xl">
          <button onClick={() => onAdd(selected)} disabled={selected.length === 0} className={BTN_PRIMARY}>
            {selected.length > 1 ? `Add ${selected.length} forms` : 'Add form'}
          </button>
          <button onClick={onClose} className={BTN_SECONDARY}>
            Cancel
          </button>
          <span className="ml-auto text-xs text-gray-500">
            {selected.length ? `${selected.length} selected` : `${catalog.length} forms available`}
            {existingForms.length > 0 && ` · ${existingForms.length} already added`}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Nexus Setup Editor ───────────────────────────────
function NexusSetupEditor({
  savedRows,
  nexusRows,
  questionnaire,
  onNexusRowsChange,
  onSaveFilingSetup,
  onBack,
  editorMode,
}: {
  editorMode: 'new' | 'existing'
  // The rows as last saved, to spot unsaved changes.
  savedRows: NexusRow[]
  nexusRows: NexusRow[]
  questionnaire: QuestionnaireAnswers | null
  onNexusRowsChange: (rows: NexusRow[]) => void
  onSaveFilingSetup: () => void
  onBack: () => void
  // Opens the new tax registration modal; the new state joins the list below.
}) {
  const [addingFormFor, setAddingFormFor] = useState<string | null>(null)

  const addForms = (rowId: string, forms: string[]) => {
    onNexusRowsChange(nexusRows.map((r) => (r.id === rowId ? { ...r, forms: [...r.forms, ...forms] } : r)))
    setAddingFormFor(null)
  }

  const removeForm = (rowId: string, form: string) =>
    onNexusRowsChange(nexusRows.map((r) => (r.id === rowId ? { ...r, forms: r.forms.filter((f) => f !== form) } : r)))

  // Unsaved changes: compare the working rows with what was last saved.
  const snapshot = (rows: NexusRow[]) => JSON.stringify(rows.map((r) => [r.id, [...r.forms].sort()]))
  const changeCount = (() => {
    let n = 0
    const ids = new Set([...savedRows.map((r) => r.id), ...nexusRows.map((r) => r.id)])
    ids.forEach((id) => {
      const a = savedRows.find((r) => r.id === id)
      const b = nexusRows.find((r) => r.id === id)
      if (!a || !b) n += 1
      else {
        const added = b.forms.filter((f) => !a.forms.includes(f)).length
        const removed = a.forms.filter((f) => !b.forms.includes(f)).length
        n += added + removed
      }
    })
    return n
  })()
  const dirty = snapshot(savedRows) !== snapshot(nexusRows)
  const [confirmLeave, setConfirmLeave] = useState(false)
  // Saving is always allowed, even with no forms or no changes.
  const save = () => onSaveFilingSetup()
  const leave = () => (dirty ? setConfirmLeave(true) : onBack())
  const discard = () => onNexusRowsChange(savedRows)
  // Ctrl/⌘ + S saves without leaving the keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const [menuFor, setMenuFor] = useState<string | null>(null)
  // Close the row menu on any outside click or Escape.
  useEffect(() => {
    if (!menuFor) return
    const close = () => setMenuFor(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuFor])

  return (
    <div className="h-full bg-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Add tax forms
              </h3>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                Choose the tax forms to file for each state you are registered in.
              </p>
            </div>
            <button onClick={leave} className={LINK}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z" />
              </svg>
              Back
            </button>
          </div>

        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50">
            <div className="space-y-8">
              <section aria-labelledby="nexus-forms-heading">
                <div className="flex items-end justify-between gap-4 border-b border-gray-200 pb-3">
                  <div>
                    <h4 id="nexus-forms-heading" className="text-sm font-semibold text-gray-900">
                      Nexus and tax forms
                    </h4>
                    <p className="mt-0.5 text-xs text-gray-600">
                      {questionnaire
                        ? "Based on your answers, we've suggested tax forms for each state below. Review or change them."
                        : 'Add the tax forms to file for each of your registered states.'}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {questionnaire && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700">
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                        Suggested from your questionnaire
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {nexusRows.length} state{nexusRows.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {nexusRows.length === 0 && (
                    <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-xs text-gray-500">
                      No states are linked to Direct Return Filing.
                    </p>
                  )}
                  {nexusRows.map((row) => (
                    <div key={row.id} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-600">
                          {row.stateCode}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-8 text-gray-900">{row.state}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {row.forms.length === 0 && <span className="text-xs text-gray-500">No forms added yet.</span>}
                            {row.forms.map((form) => (
                              <span
                                key={form}
                                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-600"
                              >
                                {form}
                                <button onClick={() => removeForm(row.id, form)} aria-label={`Remove ${form}`} className="text-blue-600 hover:text-blue-700">
                                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <button onClick={() => setAddingFormFor(row.id)} className={BTN_XS_PRIMARY}>
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                            Add form
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuFor(menuFor === row.id ? null : row.id)
                              }}
                              aria-haspopup="menu"
                              aria-expanded={menuFor === row.id}
                              aria-label={`More options for ${row.state}`}
                              className={`${BTN_ICON} h-7 w-7`}
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                                <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                              </svg>
                            </button>
                            {menuFor === row.id && (
                              <div
                                role="menu"
                                className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                              >
                                <button
                                  role="menuitem"
                                  disabled={row.forms.length === 0}
                                  onClick={() => onNexusRowsChange(nexusRows.map((r) => (r.id === row.id ? { ...r, forms: [] } : r)))}
                                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white"
                                >
                                  Clear all forms
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              </section>

            </div>
        </div>

        {/* Save bar: always in view, shows what will be saved */}
        <div className="flex items-center justify-between gap-4 border-t border-gray-200 bg-white px-6 py-3">
          <p className="flex items-center gap-2 text-xs text-gray-600" aria-live="polite">
            {dirty ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                {changeCount} unsaved change{changeCount !== 1 ? 's' : ''}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-green-600" aria-hidden="true">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                All changes saved
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-gray-400 sm:inline">
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-sans">⌘/Ctrl</kbd>{' '}
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-sans">S</kbd> to save
            </span>
            <button onClick={discard} disabled={!dirty} className={`${BTN_SECONDARY} disabled:opacity-50`}>
              Discard
            </button>
            <button onClick={save} className={BTN_PRIMARY}>
              {dirty ? 'Save changes' : 'Save'}
            </button>
          </div>
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

      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="leave-title" className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="px-6 pt-5 pb-4">
              <h2 id="leave-title" className="text-base font-semibold text-gray-900">
                Save your changes?
              </h2>
              <p className="mt-1.5 text-sm text-gray-600">
                You have {changeCount} unsaved change{changeCount !== 1 ? 's' : ''} to your tax forms.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-b-xl border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button onClick={() => setConfirmLeave(false)} className={`${BTN_GHOST} mr-auto`}>
                Keep editing
              </button>
              <button onClick={onBack} className={BTN_SECONDARY}>
                Discard
              </button>
              <button onClick={onSaveFilingSetup} className={BTN_PRIMARY}>
                Save and go back
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  )
}

// ─── Direct Tax: active page (after connecting Avalara) ─
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

function DisableDirectTaxModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="disable-title"
        aria-describedby="disable-desc"
        className="w-full max-w-[420px] rounded-xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="px-6 pt-5 pb-4">
          <h2 id="disable-title" className="text-base font-semibold text-gray-900">
            Disable Direct Return Filing?
          </h2>
          <p id="disable-desc" className="mt-1.5 text-sm leading-5 text-gray-600">
            Avalara will stop filing direct tax returns for your business, and your FPOA and tax form setups will be
            removed. You can set it up again at any time.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-b-xl border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onConfirm} className={`${BTN_BASE} px-4 bg-red-600 text-white hover:bg-red-700`}>
            Disable
          </button>
          <button onClick={onCancel} className={BTN_SECONDARY}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// One-line setup summary (segmented progress, a link per open step) that expands to the step list.
// Used on both the first page and the Direct Return Filing page.
type StepAction = { label: string; onClick: () => void }
function SetupSummaryCard({
  title,
  quiet,
  open,
  onToggle,
  done,
  summary,
  actions,
  markable,
  hints,
  doneDetails,
  summaryActions = {},
}: {
  title: string
  // Grey and low-key once setup no longer needs attention; otherwise highlighted.
  quiet: boolean
  open: boolean
  onToggle: () => void
  done: boolean[]
  // Steps shown as links (or ticks) in the summary line; `waiting` shows while a step can't be started yet.
  summary: { index: number; done: string; todo: string; waiting?: string }[]
  actions: Partial<Record<number, StepAction>>
  // Extra shortcuts for the summary line only (not repeated in the step list).
  summaryActions?: Partial<Record<number, StepAction>>
  markable?: Partial<Record<number, () => void>>
  hints?: Partial<Record<number, string>>
  doneDetails?: Partial<Record<number, React.ReactNode>>
}) {
  const doneCount = done.filter(Boolean).length
  const nextIndex = done.findIndex((d) => !d)
  return (
    <section
      aria-labelledby="setup-summary-heading"
      className={
        quiet
          ? 'rounded-lg border border-gray-200 bg-gray-50/80'
          : 'rounded-xl border border-blue-200 bg-white shadow-sm ring-4 ring-blue-50'
      }
    >
      {/* Row 1: what this is and how far along it is */}
      <div className="flex items-center gap-4 px-5 py-3">
        <div className="flex-shrink-0">
          <h2
            id="setup-summary-heading"
            className={quiet ? 'text-sm font-medium text-gray-700' : 'text-base font-semibold text-gray-900'}
          >
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Follow these steps to file your direct tax returns through Zoho Books and Avalara.
          </p>
        </div>
        <span className="ml-auto flex items-center gap-2 text-xs text-gray-500" aria-label={`${doneCount} of ${done.length} steps done`}>
          <span className="flex gap-0.5" aria-hidden="true">
            {done.map((d, i) => (
              <span
                key={i}
                className={`h-1.5 w-4 rounded-full ${d ? 'bg-green-500' : i === nextIndex ? 'bg-blue-500' : 'bg-gray-200'}`}
              />
            ))}
          </span>
          <span className="whitespace-nowrap">
            <span className="font-medium tabular-nums text-gray-700">
              {doneCount} of {done.length}
            </span>{' '}
            done
          </span>
        </span>
        <button
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="setup-details"
          className="inline-flex flex-shrink-0 items-center gap-1 border-l border-gray-200 pl-4 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          {open ? 'Hide steps' : 'Show all steps'}
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 fill-current transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
          </svg>
        </button>
      </div>

      {/* Row 2 (collapsed): each step as a chip, in order; the next one is the only solid button */}
      {!open && (
        <ul
          aria-label="Setup steps"
          className={`flex flex-wrap items-center gap-2 border-t px-5 py-3 ${quiet ? 'border-gray-200' : 'border-blue-100'}`}
        >
          {summary.map(({ index, done: doneLabel, todo, waiting }) => {
            const action = actions[index] ?? summaryActions[index]
            const chip = 'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs whitespace-nowrap'
            if (done[index])
              return (
                <li key={index} className={`${chip} bg-green-50 text-green-700`}>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  {doneLabel}
                </li>
              )
            if (!action)
              return waiting ? (
                <li key={index} className={`${chip} bg-gray-100 text-gray-400`}>
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2Zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2Zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2Z" />
                  </svg>
                  {waiting}
                </li>
              ) : null
            const isNext = index === nextIndex
            return (
              <li key={index}>
                <button
                  onClick={action.onClick}
                  className={
                    isNext
                      ? `${chip} bg-blue-600 font-medium text-white hover:bg-blue-700`
                      : `${chip} border border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50`
                  }
                >
                  {isNext && <span className="text-blue-100">Next</span>}
                  {todo}
                  {isNext && (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                      <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {open && (
        <div id="setup-details" className={`border-t p-4 ${quiet ? 'border-gray-200' : 'border-blue-100'}`}>
          <SetupChecklist
            bare
            done={done}
            title="Setup steps"
            intro=""
            actions={actions}
            markable={markable}
            hints={hints}
            doneDetails={doneDetails}
          />
        </div>
      )}
    </section>
  )
}

// First page: what can be done before connecting.
const OVERVIEW_SETUP_SUMMARY = [
  { index: 0, done: 'Tax registrations added', todo: 'Add Tax Registration' },
  { index: 1, done: 'Avalara connected', todo: 'Connect Avalara' },
]

// Setup steps shown in the one-line summary (Avalara is always connected on this page).
const SETUP_SUMMARY = [
  { index: 0, done: 'Registrations', todo: 'Add Tax Registration' },
  { index: 2, done: 'FPOA', todo: 'Sign FPOA' },
  { index: 3, done: 'Bank', todo: 'Connect bank account' },
  { index: 4, done: 'Tax forms', todo: 'Add tax forms', waiting: 'Tax forms after FPOA' },
]

function DirectTaxActivePage({
  focus,
  bankAccount,
  onSaveBankAccount,
  fpoaStatus,
  fpoaSignedAt,
  setups,
  onFpoaSign,
  onViewSetup,
  onDisable,
  onManageRegistrations,
  setupDone,
  onMarkRegistrationsDone,
  questionnaire,
  onQuestionnaireSubmit,
}: {
  setupDone: boolean[]
  onMarkRegistrationsDone: () => void
  questionnaire: QuestionnaireAnswers | null
  onQuestionnaireSubmit: (answers: QuestionnaireAnswers) => void
  focus: DirectTaxSegment
  bankAccount: BankAccount | null
  onSaveBankAccount: (account: BankAccount) => void
  fpoaStatus: FpoaStatus
  fpoaSignedAt: Date | null
  setups: FilingSetup[]
  onFpoaSign: () => void
  onViewSetup: (id: string) => void
  onDisable: () => void
  onManageRegistrations: () => void
}) {
  const [showBankModal, setShowBankModal] = useState(false)
  const [fpoaModalOpen, setFpoaModalOpen] = useState(false)
  // Once opened, the Acrobat Sign frame stays mounted so the signed agreement can be
  // reopened in the same session (with Adobe's download option).
  const [fpoaFrameMounted, setFpoaFrameMounted] = useState(false)
  const openFpoa = () => {
    setFpoaFrameMounted(true)
    setFpoaModalOpen(true)
  }
  // Acrobat Sign posts an ESIGN event to the parent page once the form is signed.
  useEffect(() => {
    if (fpoaStatus !== 'idle' || !fpoaFrameMounted) return
    const onMessage = (e: MessageEvent) => {
      if (!ESIGN_ORIGIN.test(e.origin)) return
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data?.type === 'ESIGN') onFpoaSign()
      } catch {
        // Not an Acrobat Sign event.
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [fpoaStatus, fpoaFrameMounted])
  const [confirmDisable, setConfirmDisable] = useState(false)

  const signed = fpoaStatus === 'processing'
  // One table row per nexus card, across every saved setup.
  const nexusEntries = setups.flatMap((setup) => setup.rows.map((row) => ({ setup, row })))

  // Setup and authorization comes first: until registrations, Avalara, FPOA and bank are
  // done it is highlighted, and tax forms wait below.
  const setupReady = setupDone.slice(0, 4).every(Boolean)
  // Tax forms only wait for registrations, Avalara and the FPOA; the bank account can come later.
  const formsReady = setupDone.slice(0, 3).every(Boolean)
  // Collapsed whenever the page opens; the chip row shows each step and the next action.
  const [showSetup, setShowSetup] = useState(false)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  // Offered once the FPOA is signed; gone once answered or once any state has forms.
  const showQuestionnaireCard =
    signed && nexusEntries.length > 0 && !questionnaire && nexusEntries.every(({ row }) => row.forms.length === 0)
  useEffect(() => {
    if (setupReady) setShowSetup(false)
  }, [setupReady])
  const needsForms = nexusEntries.filter(({ row }) => row.forms.length === 0).length
  const setupActions: Partial<Record<number, { label: string; onClick: () => void }>> = {
    0: { label: 'Add Tax Registration', onClick: onManageRegistrations },
    2: { label: 'View and sign FPOA', onClick: () => openFpoa() },
    3: { label: 'Connect bank account', onClick: () => setShowBankModal(true) },
  }

  const scrollTo = (segment: DirectTaxSegment) =>
    document.getElementById(`segment-${segment}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // Coming back from the forms editor lands on the tax forms segment.
  useEffect(() => {
    if (focus === 'forms') scrollTo('forms')
  }, [focus])

  return (
    <div className="space-y-5 p-6">
      {/* Status: a slim header, not a card */}
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 id="direct-tax-status" className="text-base font-semibold text-gray-900">
              Direct Return Filing
            </h1>
            <StatusPill tone="success">Active</StatusPill>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">Avalara files your direct tax returns for each registered state.</p>
        </div>
        <button onClick={() => setConfirmDisable(true)} className={`${BTN_GHOST} text-gray-600`}>
          Disable
        </button>
      </header>

      {/* Setup and authorization: first, and the focus until it's done; then one summary line */}
      <SetupSummaryCard
        title={setupReady ? 'Setup and authorization' : 'Finish setting up'}
        quiet={setupReady}
        open={showSetup}
        onToggle={() => setShowSetup((v) => !v)}
        done={setupDone}
        summary={SETUP_SUMMARY}
        actions={setupActions}
        markable={{ 0: onMarkRegistrationsDone }}
        hints={{ 4: formsReady ? 'Continue in Tax forms below' : 'After signing the FPOA' }}
        summaryActions={
          formsReady && nexusEntries.length > 0
            ? { 4: { label: 'Add tax forms', onClick: () => onViewSetup('registrations') } }
            : {}
        }
        doneDetails={{
          3: bankAccount && (
            <>
              <span className="text-gray-600">
                {bankAccount.bank} ••{bankAccount.last4}
              </span>
              <button onClick={() => setShowBankModal(true)} className={LINK_SM}>
                Change
              </button>
            </>
          ),
          2: (
            <>
              <span className="text-gray-600">Signed{fpoaSignedAt ? ` ${formatDate(fpoaSignedAt)}` : ''}</span>
              <button onClick={openFpoa} className={LINK_SM}>
                View document
              </button>
            </>
          ),
        }}
      />

      {/* Tax questionnaire: only once the FPOA is signed */}
      {showQuestionnaireCard && (
        <section
          aria-labelledby="questionnaire-heading"
          className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-5 py-4"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-blue-600" aria-hidden="true">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm0 16H5V5h14v14ZM7 7h10v2H7V7Zm0 4h10v2H7v-2Zm0 4h6v2H7v-2Z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 id="questionnaire-heading" className="text-sm font-semibold text-gray-900">
                Tax questionnaire
              </h2>
              <span className="text-xs text-gray-500">Optional</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-600">
              Answer a few questions about your registered states to get suggested tax forms for each nexus.
            </p>
          </div>
          <button
            onClick={() => setShowQuestionnaire(true)}
            className={`${BTN_XS_BASE} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
          >
            Answer questionnaire
          </button>
        </section>
      )}

      {/* Centre of action: tax forms */}
      <div>
      <section
        id="segment-forms"
        aria-labelledby="tax-return-heading"
        className={`scroll-mt-6 overflow-hidden bg-white ${
          formsReady ? 'rounded-xl border border-blue-200 shadow-sm ring-4 ring-blue-50' : 'rounded-lg border border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="tax-return-heading"
                className={formsReady ? 'text-base font-semibold text-gray-900' : 'text-sm font-semibold text-gray-500'}
              >
                Tax forms by nexus
              </h2>
              {!formsReady && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2Zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2Zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2Z" />
                  </svg>
                  After FPOA
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums">
                {nexusEntries.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-600">
              {!formsReady
                ? 'Available once the FPOA above is signed.'
                : nexusEntries.length === 0
                ? 'Add a tax registration, then choose the returns Avalara files for it.'
                : needsForms > 0
                  ? `${needsForms} of ${nexusEntries.length} state${nexusEntries.length !== 1 ? 's' : ''} still need${needsForms === 1 ? 's' : ''} tax forms.`
                  : 'Every state has its tax forms. Avalara files these returns for you.'}
            </p>
          </div>
          <button onClick={onManageRegistrations} className={BTN_SECONDARY}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Add tax registration
          </button>
        </div>

        {nexusEntries.length === 0 ? (
          <div className="flex flex-col items-center border-t border-gray-200 px-6 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-gray-400" aria-hidden="true">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Zm-3-5V3.5L18.5 9H13Z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-900">No nexus regions yet</p>
            <p className="mt-1 max-w-sm text-xs text-gray-600">
              Add a tax registration for each region you file in, then choose the tax forms for it here.
            </p>
          </div>
        ) : (
        <table className="w-full table-fixed text-left">
          <thead className="border-y border-gray-200 bg-gray-50">
            <tr>
              <th scope="col" className="w-[38%] whitespace-nowrap py-2.5 pl-15 pr-5 text-xs font-medium text-gray-500">
                Tax form
              </th>
              <th scope="col" className="whitespace-nowrap px-5 py-2.5 text-xs font-medium text-gray-500">
                Description
              </th>
              <th scope="col" className="w-40 whitespace-nowrap px-5 py-2.5 text-right text-xs font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          {/* One tbody per state: the state is the group row, its forms are the rows below */}
          {nexusEntries.map(({ setup, row }) => {
            const key = `${setup.id}:${row.id}`
            const hasForms = row.forms.length > 0
            const catalog = formsForRegion(row.stateCode)
            return (
              <tbody key={key} className="border-b border-gray-200 last:border-b-0">
                <tr className="bg-gray-50/70">
                  <th scope="rowgroup" colSpan={2} className="px-5 py-2.5 text-left font-normal">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-blue-50 text-[11px] font-bold text-blue-600">
                        {row.stateCode}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{row.state}</span>
                      <span className="rounded-full bg-gray-200/70 px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums">
                        {row.forms.length} form{row.forms.length !== 1 ? 's' : ''}
                      </span>
                      {!hasForms && <StatusPill tone="warning">Needs forms</StatusPill>}
                      <span className="whitespace-nowrap text-xs text-gray-500">
                        {row.registeredOn ? `Registered ${formatIsoDate(row.registeredOn)}` : `Saved ${formatDate(setup.savedAt)}`}
                      </span>
                    </div>
                  </th>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => onViewSetup(setup.id)}
                      disabled={!formsReady}
                      title={formsReady ? undefined : 'Sign the FPOA first'}
                      className={`${hasForms ? LINK_SM : BTN_XS_PRIMARY} whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {hasForms ? 'Edit tax forms' : 'Add tax forms'}
                    </button>
                  </td>
                </tr>
                {hasForms ? (
                    row.forms.map((form) => (
                      <tr key={form} className="border-t border-gray-100 hover:bg-gray-50/60">
                        <td className="py-2.5 pl-15 pr-5">
                          <div className="flex items-center gap-2.5">
                            <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 fill-gray-400" aria-hidden="true">
                              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Zm-3-5V3.5L18.5 9H13Z" />
                            </svg>
                            <span className="whitespace-nowrap text-sm text-gray-800">{form}</span>
                          </div>
                        </td>
                        <td className="px-5 py-2.5 text-sm text-gray-600">
                          {catalog.find((f) => f.name === form)?.description ?? '—'}
                        </td>
                        <td className="px-5 py-2.5" />
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-gray-100">
                      <td colSpan={3} className="py-2.5 pl-15 pr-5 text-xs text-gray-500">
                        No tax forms yet. Avalara won't file returns for {row.state} until you add them.
                      </td>
                    </tr>
                  )}
              </tbody>
            )
          })}
        </table>
        )}
      </section>
      </div>

      {showQuestionnaire && (
        <QuestionnaireModal
          regions={nexusEntries.map(({ row }) => ({ code: row.stateCode, name: row.state }))}
          initialAnswers={questionnaire ?? EMPTY_ANSWERS}
          onSubmit={(answers) => {
            onQuestionnaireSubmit(answers)
            setShowQuestionnaire(false)
          }}
          onClose={() => setShowQuestionnaire(false)}

        />

      )}

      {showBankModal && (
        <BankAccountModal
          current={bankAccount}
          onSave={(account) => {
            onSaveBankAccount(account)
            setShowBankModal(false)
          }}
          onClose={() => setShowBankModal(false)}
        />
      )}

      {(fpoaFrameMounted || (fpoaModalOpen && signed)) && (
        <FpoaSignModal
          open={fpoaModalOpen}
          signed={signed}
          signing={fpoaStatus === 'signing'}
          liveSession={fpoaFrameMounted}
          onConfirmSigned={onFpoaSign}
          onClose={() => setFpoaModalOpen(false)}
        />
      )}

      {confirmDisable && (
        <DisableDirectTaxModal
          onConfirm={() => {
            setConfirmDisable(false)
            onDisable()
          }}
          onCancel={() => setConfirmDisable(false)}
        />
      )}
    </div>
  )
}

// ─── Tax Registration section ─────────────────────────
function TaxRegistrationSection({
  registrations,
  onAdd,
}: {
  registrations: TaxRegistration[]
  onAdd: (registration: TaxRegistration) => void
}) {
  const [creating, setCreating] = useState(false)

  if (creating) {
    return (
      <NewTaxRegistrationForm
        registeredCodes={registrations.map((r) => r.code)}
        onSave={(registration) => {
          onAdd(registration)
          setCreating(false)
        }}
        onCancel={() => setCreating(false)}
      />
    )
  }

  const findAccountants = (
    <button className={LINK}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.75" aria-hidden="true">
        <circle cx="12" cy="7" r="3.5" />
        <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" strokeLinecap="round" />
      </svg>
      Find Accountants
    </button>
  )

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Tax Registration</h1>
        <div className="flex items-center gap-4">
          {registrations.length > 0 && (
            <button onClick={() => setCreating(true)} className={BTN_PRIMARY}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              New Tax Registration
            </button>
          )}
          <span className="h-6 w-px bg-gray-200" aria-hidden="true" />
          {findAccountants}
        </div>
      </div>

      {registrations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <h2 className="text-xl font-medium text-gray-900">Create Tax Registration in Zoho Books</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
            If your business is registered for Tax, you can configure it in your organization. Once configured, you can set
            up and manage the applicable Taxes for your transactions.
          </p>
          <button onClick={() => setCreating(true)} className={`mt-6 ${BTN_PRIMARY}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            New Tax Registration
          </button>
        </div>
      ) : (
        <table className="w-full text-left">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {['State', 'Local jurisdiction count', 'Tax registered on', 'Status', 'Tax deregistered on'].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-6 py-2.5 text-xs font-medium text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {registrations.map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-3.5 text-sm text-gray-900">{r.name}</td>
                <td className="px-6 py-3.5 text-sm text-gray-800 tabular-nums">{r.jurisdictions.length}</td>
                <td className="px-6 py-3.5 text-sm text-gray-800 whitespace-nowrap">{formatIsoDate(r.registeredOn)}</td>
                <td className="px-6 py-3.5">
                  <StatusPill tone="success">Active</StatusPill>
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-400">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function NewTaxRegistrationForm({
  registeredCodes,
  onSave,
  onCancel,
  asModal = false,
}: {
  // The first registration happens in a modal; later ones on the Tax Registration page.
  asModal?: boolean
  registeredCodes: string[]
  onSave: (registration: TaxRegistration) => void
  onCancel: () => void
}) {
  const available = US_STATES.filter((st) => !registeredCodes.includes(st.code))
  const [code, setCode] = useState(available[0]?.code ?? '')
  const [registeredOn, setRegisteredOn] = useState(todayIso())
  const [jurisdictions, setJurisdictions] = useState<{ name: string; registeredOn: string }[]>([])
  const [touched, setTouched] = useState(false)
  const state = US_STATES.find((st) => st.code === code)
  const options = jurisdictionsFor(code)
  const dateMissing = touched && !registeredOn

  const changeState = (next: string) => {
    setCode(next)
    setJurisdictions([]) // jurisdictions belong to the previous state
  }

  const save = () => {
    setTouched(true)
    if (!state || !registeredOn) return
    onSave({
      id: `reg-${code}-${Date.now()}`,
      code,
      name: state.name,
      registeredOn,
      jurisdictions: jurisdictions.filter((j) => j.name),
    })
  }

  const fieldClass = 'h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 hover:border-gray-400'

  const fields = (
        <div className={`space-y-6 ${asModal ? '' : 'max-w-2xl'}`}>
          <div className={`grid ${asModal ? 'grid-cols-[9rem_1fr]' : 'grid-cols-[12rem_1fr]'} items-center gap-4`}>
            <label htmlFor="reg-state" className="text-sm text-gray-900">
              State
            </label>
            <select id="reg-state" value={code} onChange={(e) => changeState(e.target.value)} className={fieldClass}>
              {available.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name}
                </option>
              ))}
            </select>

            <label htmlFor="reg-date" className="text-sm text-red-600">
              Registration Date*
            </label>
            <div>
              <input
                id="reg-date"
                type="date"
                value={registeredOn}
                onChange={(e) => setRegisteredOn(e.target.value)}
                aria-invalid={dateMissing}
                className={`${fieldClass} ${dateMissing ? 'border-red-500' : ''}`}
              />
              {dateMissing && <p className="mt-1 text-xs text-red-600">Enter the registration date.</p>}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900">Local Tax Registration Details</h2>
            <p className="mt-1 text-sm text-gray-600">
              If your business is registered with local tax authorities in the state of {state?.name}, add those details
              below.
            </p>

            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th scope="col" className="w-1/2 px-4 py-2.5 text-xs font-medium text-gray-500">Local jurisdiction</th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-medium text-gray-500">Tax registration date</th>
                    <th scope="col" className="w-10 px-2"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {jurisdictions.map((j, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">
                        <select
                          aria-label="Local jurisdiction"
                          value={j.name}
                          onChange={(e) =>
                            setJurisdictions((prev) => prev.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))
                          }
                          className={fieldClass}
                        >
                          {options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          aria-label="Tax registration date"
                          value={j.registeredOn}
                          onChange={(e) =>
                            setJurisdictions((prev) =>
                              prev.map((x, k) => (k === i ? { ...x, registeredOn: e.target.value } : x)),
                            )
                          }
                          className={fieldClass}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => setJurisdictions((prev) => prev.filter((_, k) => k !== i))}
                          aria-label="Remove jurisdiction"
                          className={`${BTN_ICON} hover:text-red-500`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={`px-4 py-3 ${jurisdictions.length ? 'border-t border-gray-200' : ''}`}>
                <button
                  onClick={() => setJurisdictions((prev) => [...prev, { name: options[0], registeredOn: '' }])}
                  className={`${BTN_GHOST} bg-gray-50 text-gray-800`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-blue-600" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2Z" />
                  </svg>
                  Add Jurisdiction
                </button>
              </div>
            </div>
          </div>
        </div>
  )

  const actions = (
    <>
      <button onClick={save} disabled={!state} className={BTN_PRIMARY}>
        Save
      </button>
      <button onClick={onCancel} className={BTN_SECONDARY}>
        Cancel
      </button>
    </>
  )

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-registration-title"
          className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        >
          <div className="flex items-start gap-3 border-b border-gray-200 px-6 pt-5 pb-4">
            <div className="min-w-0 flex-1">
              <h2 id="new-registration-title" className="text-base font-semibold leading-6 text-gray-900">
                New Tax Registration
              </h2>
              <p className="mt-1 text-sm leading-5 text-gray-600">
                Direct tax is filed only in the states you are registered in.
                {registeredCodes.length === 0 ? ' Add your first registration to get started.' : ''}
              </p>
            </div>
            <button onClick={onCancel} aria-label="Close" className={`-mr-2 -mt-1 ${BTN_ICON}`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{fields}</div>
          <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">{actions}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">New Tax Registration Settings</h1>
      </div>
      <div className="flex-1 px-6 py-6">{fields}</div>
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-gray-200 bg-white px-6 py-4">{actions}</div>
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
  { id: 'direct-tax', label: 'Direct Return Filing', icon: '⚡' },
  { id: 'tax-automation', label: 'Tax Automation Settings' },
]

// ─── How setup works ──────────────────────────────────
const SETUP_STEPS: { title: string; short: string; description: string; icon: string }[] = [
  {
    title: 'Add your tax registrations',
    short: 'Tax registrations',
    description:
      'Add every state where your business is registered for tax. Direct Return Filing only files returns for the states you add here.',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5Z',
  },
  {
    title: 'Connect to Avalara',
    short: 'Connect Avalara',
    description:
      'Accept the Zoho Books and Avalara terms to connect your account. Avalara is the certified partner that prepares and files your returns.',
    icon: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5Z',
  },
  {
    title: 'Sign the FPOA',
    short: 'Sign FPOA',
    description:
      'Review and sign the Funding Power of Attorney in Adobe Acrobat Sign. It authorizes Avalara to file returns and pay the tax due on your behalf.',
    icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  },
  {
    title: 'Connect a bank account',
    short: 'Bank account',
    description:
      'Connect the bank account you named on the FPOA. Avalara debits it to pay the tax due on each return. Nothing is debited until a return is filed.',
    icon: 'M4 10h3v7H4v-7Zm6.5 0h3v7h-3v-7ZM2 19h20v3H2v-3Zm15-9h3v7h-3v-7ZM12 1 2 6v2h20V6L12 1Z',
  },
  {
    title: 'Choose forms for each state',
    short: 'Tax forms',
    description:
      'Pick the returns to file for each registered state. Available once the FPOA is signed, even before the bank account is connected; an optional tax questionnaire can suggest them for you.',
    icon: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Zm-3-5V3.5L18.5 9H13Z',
  },
]

// Read-only: a step is ticked by finishing its action, never by clicking it.
function SetupChecklist({
  done,
  title,
  intro,
  actions = {},
  markable = {},
  hints = {},
  defaultCollapsed = false,
  bare = false,
  doneDetails = {},
}: {
  // List only: no title, progress bar, intro or collapse (the parent shows those).
  bare?: boolean
  // Shown instead of "Completed" on a finished step, e.g. the connected bank and a Change link.
  doneDetails?: Partial<Record<number, React.ReactNode>>
  // Start with the step list hidden (used once Direct Return Filing is active).
  defaultCollapsed?: boolean
  done: boolean[]
  title: string
  intro: string
  actions?: Partial<Record<number, { label: string; onClick: () => void }>>
  // Steps the user may tick by hand (only Step 1 today).
  markable?: Partial<Record<number, () => void>>
  // Shown on an unfinished step that has no shortcut yet.
  hints?: Partial<Record<number, string>>
}) {
  const doneCount = done.filter(Boolean).length
  // Only the next unfinished step gets a primary button; other shortcuts are links.
  const nextIndex = done.findIndex((d) => !d)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div>
      {!bare && (<>
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${(doneCount / SETUP_STEPS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 tabular-nums">
          {doneCount} of {SETUP_STEPS.length} completed
        </span>
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="setup-steps"
          aria-label={collapsed ? 'Show setup steps' : 'Hide setup steps'}
          className={`-mr-1.5 ${BTN_ICON} h-7 w-7`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 fill-current transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            aria-hidden="true"
          >
            <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
          </svg>
        </button>
      </div>
      {collapsed ? (
        nextIndex === -1 ? (
          <p className="mt-1 text-xs text-gray-600">All steps are completed.</p>
        ) : (
          // What's next: set off by a divider, with the step's number, name, description and shortcut
          <div className="-mx-5 -mb-4 mt-4 flex items-center gap-3 rounded-b-lg border-t border-gray-200 bg-blue-50/60 px-5 py-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {nextIndex + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <span className="rounded bg-blue-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                  Up next
                </span>
                <span className="text-sm font-medium text-gray-900">{SETUP_STEPS[nextIndex].short}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-600">{SETUP_STEPS[nextIndex].description}</p>
            </div>
            {actions[nextIndex] && (
              <button onClick={actions[nextIndex]!.onClick} className={BTN_XS_PRIMARY}>
                {actions[nextIndex]!.label}
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                  <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </button>
            )}
          </div>
        )
      ) : (
        <p className="mt-1 text-xs text-gray-600">{intro}</p>
      )}
      </>)}

      {/* One row per step: number · name and description · status or actions, right-aligned */}
      {(bare || !collapsed) && (
      <ol id="setup-steps" aria-label={bare ? title : undefined} className={`${bare ? '' : 'mt-3'} divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white`}>
        {SETUP_STEPS.map((step, i) => {
          const isDone = done[i]
          const action = actions[i]
          const markDone = markable[i]
          const hint = hints[i]
          return (
            <li key={step.title} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`flex h-5 w-5 flex-shrink-0 self-start mt-px items-center justify-center rounded-full text-xs font-semibold ${
                  isDone ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-500'
                }`}
                aria-hidden="true"
              >
                {isDone ? (
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className={`text-sm font-medium leading-5 ${isDone ? 'text-gray-500' : 'text-gray-900'}`}>
                  {step.short}
                  <span className="sr-only">{isDone ? ' (completed)' : ' (not completed)'}</span>
                </h4>
                <p className="mt-0.5 max-w-2xl text-xs leading-5 text-gray-500">{step.description}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-4">
                {isDone ? (
                  doneDetails[i] ? (
                    <span className="flex items-center gap-3 text-xs">{doneDetails[i]}</span>
                  ) : (
                    <span className="text-xs font-medium text-green-700">Completed</span>
                  )
                ) : (
                  <>
                    {markDone && (
                      <button onClick={markDone} className="text-xs font-medium text-gray-500 hover:text-gray-800 hover:underline">
                        Mark as completed
                      </button>
                    )}
                    {action ? (
                      <button onClick={action.onClick} className={i === nextIndex ? BTN_XS_PRIMARY : LINK_SM}>
                        {action.label}
                      </button>
                    ) : (
                      !markDone && <span className="text-xs text-gray-400">{hint ?? 'Not started'}</span>
                    )}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      )}
    </div>
  )
}

// ─── How your tax is calculated ───────────────────────
const TAX_CALCULATION_FACTORS = [
  {
    id: 'registered',
    title: "Where You're Registered",
    body: 'Returns are filed only in the regions where you are registered and have nexus.',
  },
  {
    id: 'business',
    title: 'How Your Business Is Set Up',
    body: 'Your entity type — corporation, LLC, partnership or sole proprietorship — decides which return forms apply.',
  },
  {
    id: 'operate',
    title: 'Where You Operate',
    body: 'An office, employees or inventory in a region can add withholding and estimated-payment filings there.',
  },
]

function TaxCalculationAccordion() {
  const [openId, setOpenId] = useState<string | null>(TAX_CALCULATION_FACTORS[0].id)
  return (
    <div>
      <p className="flex items-center gap-2 border-b border-gray-200 pb-2.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-amber-500" aria-hidden="true">
          <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1Zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7Z" />
        </svg>
        How your tax is calculated
      </p>
      <ul className="mt-3 border-l border-gray-200">
        {TAX_CALCULATION_FACTORS.map((f) => {
          const open = openId === f.id
          return (
            <li key={f.id} className={`-ml-px border-l-2 ${open ? 'border-blue-600' : 'border-transparent'}`}>
              <button
                onClick={() => setOpenId(open ? null : f.id)}
                aria-expanded={open}
                aria-controls={`tax-factor-${f.id}`}
                className="flex w-full items-center gap-2 py-2 pl-3 text-left"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 flex-shrink-0 fill-gray-500 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
                <span className={`text-sm ${open ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{f.title}</span>
              </button>
              {open && (
                <p id={`tax-factor-${f.id}`} className="pb-3 pl-9 pr-2 text-sm leading-5 text-gray-600">
                  {f.body}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Main Screen Component ────────────────────────────
function DirectTaxSettings({
  onOpenSetup,
  setupPage,
  registrationPage,
  showRegistrationTab,
  setupDone,
  onMarkRegistrationsDone,
  onGoToRegistration,
  selectedSection,
  onSelectSection: setSelectedSection,
}: {
  onOpenSetup: () => void
  setupPage?: React.ReactNode
  registrationPage: React.ReactNode
  showRegistrationTab: boolean
  setupDone: boolean[]
  onMarkRegistrationsDone: () => void
  // fromSteps: the Step 1 link keeps the user on this page after the first registration is saved.
  onGoToRegistration: (fromSteps?: boolean) => void
  selectedSection: string
  onSelectSection: (id: string) => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [showSteps, setShowSteps] = useState(true)

  return (
    <div className="flex h-full flex-1 min-w-0 gap-0">
      {/* Middle Column - Section List */}
      <div className="w-64 border-r border-gray-200 bg-white p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 px-2">Taxes</h2>
        <div className="space-y-1">
          {TAX_SECTIONS.filter((section) => section.id !== 'tax-registration' || showRegistrationTab).map((section) => (
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
          <div className="space-y-6 p-6">
            {/* Configure Direct Return Filing — compact; details on demand so the steps lead */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-blue-600" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
                    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-semibold text-gray-900">Configure Direct Return Filing</h1>
                  <h2 className="text-xs font-normal text-gray-600">
                    Set up automatic direct tax calculation by integrating with Zoho Books or Avalara.
                  </h2>
                  <button
                    onClick={() => setShowDetails((v) => !v)}
                    aria-expanded={showDetails}
                    aria-controls="direct-tax-details"
                    className={`${LINK_SM} mt-1`}
                  >
                  {showDetails ? 'Hide details' : 'Learn more'}
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-3.5 w-3.5 fill-current transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                  </svg>
                  </button>
                </div>
                <button onClick={onOpenSetup} className={BTN_PRIMARY}>
                  Set up Direct Return Filing
                </button>
              </div>

              {showDetails && (
                <div
                  id="direct-tax-details"
                  className="grid items-start gap-x-10 gap-y-6 border-t border-gray-200 bg-gray-50/60 py-5 pl-5 pr-5 sm:pl-[4.25rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
                >
                  <div>
                    <p className="border-b border-gray-200 pb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      What you get
                    </p>
                    <ul className="mt-3 space-y-2.5">
                      {DIRECT_TAX_CARD_BENEFITS.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2.5">
                          <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
                          <span className="text-sm leading-5 text-gray-800">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <TaxCalculationAccordion />
                </div>
              )}
            </div>

            {/* Setup: same summary card as the Direct Return Filing page, open by default */}
            <SetupSummaryCard
              title="Setup progress"
              quiet={false}
              open={showSteps}
              onToggle={() => setShowSteps((v) => !v)}
              done={setupDone}
              summary={OVERVIEW_SETUP_SUMMARY}
              actions={{
                0: { label: 'Add Tax Registration', onClick: () => onGoToRegistration(true) },
                1: { label: 'Connect Avalara', onClick: onOpenSetup },
              }}
              markable={{ 0: onMarkRegistrationsDone }}
              hints={{ 2: 'After connecting', 3: 'After connecting', 4: 'After connecting' }}
            />
          </div>
        )}

        {selectedSection === 'tax-registration' && registrationPage}

        {selectedSection !== 'direct-tax' && selectedSection !== 'tax-registration' && (
          <div className="bg-white border border-gray-200 p-6 rounded-lg m-6">
            <h2 className="text-base font-semibold text-gray-900">
              {TAX_SECTIONS.find((s) => s.id === selectedSection)?.label}
            </h2>
            <p className="text-sm text-gray-600 mt-4">
              This section is coming soon. Select "Direct Return Filing" to configure your tax settings.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── App Wrapper ──────────────────────────────────────
// `headerSlot` lets the version switcher sit in the top bar next to Help.
export default function AppCanonical({ headerSlot }: { headerSlot?: React.ReactNode } = {}) {
  const [appPage, setAppPage] = useState<AppPage>('overview')
  const [selectedSection, setSelectedSection] = useState('direct-tax')
  const [activeSegment, setActiveSegment] = useState<DirectTaxSegment>('fpoa')
  const [showAvalaraModal, setShowAvalaraModal] = useState(false)
  const [fpoaStatus, setFpoaStatus] = useState<FpoaStatus>('idle')
  const [fpoaSignedAt, setFpoaSignedAt] = useState<Date | null>(null)
  // Tax registrations are the source of truth for which states Direct Tax files in.
  const [registrations, setRegistrations] = useState<TaxRegistration[]>([])
  const [taxForms, setTaxForms] = useState<Record<string, string[]>>({})
  const [savedQuestionnaire, setSavedQuestionnaire] = useState<QuestionnaireAnswers | null>(null)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [showFirstRegistration, setShowFirstRegistration] = useState(false)
  // Step 1 is the only step that can also be ticked by hand.
  const [registrationsMarkedDone, setRegistrationsMarkedDone] = useState(false)
  // Opened from the setup steps: stay on the page after saving instead of jumping to the tab.
  const [stayAfterRegistration, setStayAfterRegistration] = useState(false)
  const hasRegistrations = registrations.length > 0

  // The Tax Registration tab stays hidden until the first registration is saved from the modal.
  const openTaxRegistration = (fromSteps = false) => {
    if (hasRegistrations) {
      setSelectedSection('tax-registration')
      return
    }
    setStayAfterRegistration(fromSteps)
    setShowFirstRegistration(true)
  }
  const [formsSavedAt, setFormsSavedAt] = useState(() => new Date())
  // Editor working copies.
  const [nexusRows, setNexusRows] = useState<NexusRow[]>([])
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireAnswers | null>(null)

  const registeredRows: NexusRow[] = registrations.map((r) => ({
    id: r.code,
    state: r.name,
    stateCode: r.code,
    forms: taxForms[r.code] ?? [],
    registeredOn: r.registeredOn,
  }))
  const setups: FilingSetup[] = registeredRows.length
    ? [{ id: 'registrations', savedAt: formsSavedAt, rows: registeredRows, questionnaire: savedQuestionnaire }]
    : []

  const setupDone = [
    hasRegistrations || registrationsMarkedDone,
    appPage !== 'overview',
    fpoaStatus === 'processing',
    bankAccount !== null,
    registeredRows.length > 0 && registeredRows.every((r) => r.forms.length > 0),
  ]

  const openFormsEditor = () => {
    setNexusRows(registeredRows)
    setQuestionnaire(savedQuestionnaire)
    setAppPage('editor')
  }

  const backToTaxForms = () => {
    setActiveSegment('forms')
    setAppPage('active')
  }

  const handleSaveForms = () => {
    setTaxForms((prev) => ({ ...prev, ...Object.fromEntries(nexusRows.map((r) => [r.stateCode, r.forms])) }))
    setSavedQuestionnaire(questionnaire)
    setFormsSavedAt(new Date())
    showToast('Tax forms saved')
    backToTaxForms()
  }

  // Answers fill in suggested forms for each nexus state; the user reviews them in Tax forms.
  const handleQuestionnaireSubmit = (answers: QuestionnaireAnswers) => {
    const suggested = registeredRows.filter((r) => answers.nexus.includes(r.stateCode))
    setSavedQuestionnaire(answers)
    setTaxForms((prev) => ({
      ...prev,
      ...Object.fromEntries(suggested.map((r) => [r.stateCode, suggestFormsFor(answers, r.stateCode)])),
    }))
    setFormsSavedAt(new Date())
    showToast(`Suggested forms added for ${suggested.length} state${suggested.length !== 1 ? 's' : ''}`)
  }

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }

  const handleAvalaraConnect = () => {
    setShowAvalaraModal(false)
    setActiveSegment('fpoa')
    setAppPage('active')
  }

  const handleDisable = () => {
    setAppPage('overview')
    setFpoaStatus('idle')
    setFpoaSignedAt(null)
    setBankAccount(null)
    setTaxForms({})
    setSavedQuestionnaire(null)
  }

  const handleFpoaSign = () => {
    setFpoaStatus('signing')
    setTimeout(() => {
      setFpoaStatus('processing')
      setFpoaSignedAt(new Date())
    }, 1500)
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
          <h1 className="text-sm font-semibold text-gray-900">Direct Return Filing Settings</h1>
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
            onOpenSetup={() => setShowAvalaraModal(true)}
            selectedSection={selectedSection}
            onSelectSection={setSelectedSection}
            showRegistrationTab={hasRegistrations}
            setupDone={setupDone}
            onMarkRegistrationsDone={() => setRegistrationsMarkedDone(true)}
            onGoToRegistration={openTaxRegistration}
            registrationPage={
              <TaxRegistrationSection
                registrations={registrations}
                onAdd={(r) => setRegistrations((prev) => [...prev, r])}
              />
            }
            setupPage={
              appPage === 'editor' ? (
                <NexusSetupEditor
                  editorMode="existing"
                  savedRows={registeredRows}
                  nexusRows={nexusRows}
                  questionnaire={questionnaire}
                  onNexusRowsChange={setNexusRows}
                  onSaveFilingSetup={handleSaveForms}
                  onBack={backToTaxForms}
                />
              ) : appPage === 'active' ? (
                <DirectTaxActivePage
                  focus={activeSegment}
                  bankAccount={bankAccount}
                  onSaveBankAccount={setBankAccount}
                  fpoaStatus={fpoaStatus}
                  fpoaSignedAt={fpoaSignedAt}
                  setups={setups}
                  onFpoaSign={handleFpoaSign}
                  onViewSetup={openFormsEditor}
                  onDisable={handleDisable}
                  onManageRegistrations={() => openTaxRegistration()}
                  setupDone={setupDone}
                  onMarkRegistrationsDone={() => setRegistrationsMarkedDone(true)}
                  questionnaire={savedQuestionnaire}
                  onQuestionnaireSubmit={handleQuestionnaireSubmit}
                />
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Modals */}
      {showFirstRegistration && (
        <NewTaxRegistrationForm
          asModal
          registeredCodes={[]}
          onSave={(r) => {
            setRegistrations([r])
            setShowFirstRegistration(false)
            if (!stayAfterRegistration) setSelectedSection('tax-registration')
          }}
          onCancel={() => setShowFirstRegistration(false)}
        />
      )}

      {showAvalaraModal && (
        <AvalaraModal
          onConnect={handleAvalaraConnect}
          onCancel={() => setShowAvalaraModal(false)}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-green-400" aria-hidden="true">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  )
}
