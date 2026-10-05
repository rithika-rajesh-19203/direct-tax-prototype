import React, { useState, useRef, useEffect } from 'react'
// Frozen snapshot of v1.0 (2026-10-05). Do not edit: new work goes in src/App-canonical.tsx.
import { NAV_TREE, TAX_NAV_TABS } from '../app/data/navigation'

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

// ─── FPOA Document ────────────────────────────────────
// The real FPOA, served and signed through an Adobe Acrobat Sign web form.
const FPOA_ESIGN_URL =
  'https://secure.na1.echosign.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhBH-Mal45Altk9ZpKjo1B8NOnUohmFSu5uEpSq5mJoSsMUeQsbA0xUNvztdZHXKaaU*'
const ESIGN_ORIGIN = /^https:\/\/[\w.-]+\.(echosign|adobesign)\.com$/

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

// ─── Nexus Setup Editor ───────────────────────────────
function NexusSetupEditor({
  nexusRows,
  questionnaire,
  onQuestionnaireSubmit,
  onNexusRowsChange,
  onSaveFilingSetup,
  onBack,
  editorMode,
}: {
  editorMode: 'new' | 'existing'
  nexusRows: NexusRow[]
  questionnaire: QuestionnaireAnswers | null
  onQuestionnaireSubmit: (answers: QuestionnaireAnswers) => void
  onNexusRowsChange: (rows: NexusRow[]) => void
  onSaveFilingSetup: () => void
  onBack: () => void
}) {
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

  const removeForm = (rowId: string, form: string) =>
    onNexusRowsChange(nexusRows.map((r) => (r.id === rowId ? { ...r, forms: r.forms.filter((f) => f !== form) } : r)))

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
            <button onClick={onBack} className={LINK}>
              Back
            </button>
          </div>

        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50">
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
                  Save setup
                </button>
              </div>
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

      {showQuestionnaire && (
        <QuestionnaireModal
          regions={nexusRows.map((r) => ({ code: r.stateCode, name: r.state }))}
          initialAnswers={questionnaire ?? EMPTY_ANSWERS}
          onSubmit={(answers) => {
            onQuestionnaireSubmit(answers)
            setShowQuestionnaire(false)
          }}
          onClose={() => setShowQuestionnaire(false)}
        />
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

function DirectTaxActivePage({
  focus,
  fpoaStatus,
  fpoaSignedAt,
  setups,
  onFpoaSign,
  onViewSetup,
  onDisable,
  onManageRegistrations,
  setupDone,
  onMarkRegistrationsDone,
}: {
  setupDone: boolean[]
  onMarkRegistrationsDone: () => void
  focus: DirectTaxSegment
  fpoaStatus: FpoaStatus
  fpoaSignedAt: Date | null
  setups: FilingSetup[]
  onFpoaSign: () => void
  onViewSetup: (id: string) => void
  onDisable: () => void
  onManageRegistrations: () => void
}) {
  const [showSignedDocument, setShowSignedDocument] = useState(false)
  // Whether the Acrobat Sign form was loaded on this visit. After signing it keeps
  // showing the signed agreement (with Adobe's download option), so it stays mounted.
  const [esignLoaded, setEsignLoaded] = useState(fpoaStatus === 'idle')
  // Acrobat Sign posts an ESIGN event to the parent page once the form is signed.
  useEffect(() => {
    if (fpoaStatus !== 'idle') return
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
  }, [fpoaStatus])
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [expanded, setExpanded] = useState<string[]>([])
  const signed = fpoaStatus === 'processing'
  // One table row per nexus card, across every saved setup.
  const nexusEntries = setups.flatMap((setup) => setup.rows.map((row) => ({ setup, row })))
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const scrollTo = (segment: DirectTaxSegment) =>
    document.getElementById(`segment-${segment}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // Coming back from the forms editor lands on the tax forms segment.
  useEffect(() => {
    if (focus === 'forms') scrollTo('forms')
  }, [focus])

  return (
    <div className="space-y-5 p-6">
      {/* Status */}
      <section aria-labelledby="direct-tax-status" className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 id="direct-tax-status" className="text-lg font-semibold text-gray-900">
                Direct Return Filing
              </h1>
              <span className="rounded-md bg-green-700 px-2 py-0.5 text-xs font-medium text-white">Active</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              File direct tax returns automatically for each nexus region, powered by Avalara.
            </p>
          </div>
          <button onClick={() => setConfirmDisable(true)} className={BTN_SECONDARY}>
            Disable
          </button>
        </div>
      </section>

      {/* Setup progress — until every step is done */}
      {setupDone.some((d) => !d) && (
        <section className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <SetupChecklist
            done={setupDone}
            title="Setup progress"
            intro="Each step is marked completed as soon as you finish it."
            actions={{
              0: { label: 'Add Tax Registration', onClick: onManageRegistrations },
              2: { label: 'Sign FPOA', onClick: () => scrollTo('fpoa') },
              3: { label: 'Add tax forms', onClick: () => scrollTo('forms') },
            }}
            markable={{ 0: onMarkRegistrationsDone }}
          />
        </section>
      )}

      {/* Segment: FPOA signing — the document is read inline, then collapses once signed */}
      <section
        id="segment-fpoa"
        aria-labelledby="fpoa-heading"
        className="scroll-mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white"
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="fpoa-heading" className="text-sm font-semibold text-gray-900">Form POA (Power of Attorney)</h2>
              {signed ? (
                <StatusPill tone="success">Signed</StatusPill>
              ) : fpoaStatus === 'signing' ? (
                <StatusPill tone="neutral">Signing</StatusPill>
              ) : (
                <StatusPill tone="warning">Pending</StatusPill>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-600">
              {signed
                ? `Signed${fpoaSignedAt ? ` on ${formatDate(fpoaSignedAt)}` : ''}. Avalara is authorized to file direct tax returns on your behalf.`
                : "Review the FPOA below and sign it so Avalara can file returns on your behalf. Returns won't be filed until it's signed."}
            </p>
          </div>
          {signed && (
            <button
              onClick={() => setShowSignedDocument((v) => !v)}
              aria-expanded={showSignedDocument}
              aria-controls="fpoa-document"
              className={`${LINK} whitespace-nowrap`}
            >
              {showSignedDocument ? 'Hide signed document' : 'View signed document'}
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 fill-current transition-transform duration-200 ${showSignedDocument ? 'rotate-180' : ''}`}
                aria-hidden="true"
              >
                <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
              </svg>
            </button>
          )}
        </div>

        {/* The live Acrobat Sign form: read and sign the real FPOA right here */}
        {(esignLoaded || !signed) && (
          <div id="fpoa-document" className={`border-t border-gray-200 ${signed && !showSignedDocument ? 'hidden' : ''}`}>
            <div className="flex items-center justify-between bg-gray-50 px-5 py-2">
              <p className="text-xs font-medium text-gray-700">FPOA · Adobe Acrobat Sign</p>
              <a href={FPOA_ESIGN_URL} target="_blank" rel="noreferrer" className={LINK_SM}>
                Open in new tab
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                  <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7ZM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7Z" />
                </svg>
              </a>
            </div>
            <iframe
              title="FPOA document — sign with Adobe Acrobat Sign"
              src={FPOA_ESIGN_URL}
              onLoad={() => setEsignLoaded(true)}
              className="block h-[44rem] w-full border-0 border-t border-gray-200 bg-white"
            />
            {!signed && (
              <div className="flex items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-5 py-3">
                <p className="text-xs text-gray-600">
                  Fill in and sign the document above. This page updates as soon as Acrobat Sign confirms your signature.
                </p>
                <button onClick={onFpoaSign} disabled={fpoaStatus === 'signing'} className={BTN_PRIMARY}>
                  {fpoaStatus === 'signing' ? 'Confirming…' : "I've signed the document"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Signed on an earlier visit: the agreement lives in Acrobat Sign */}
        {signed && !esignLoaded && showSignedDocument && (
          <div id="fpoa-document" className="border-t border-gray-200 bg-gray-50 px-5 py-4">
            <p className="text-sm text-gray-700">
              Adobe Acrobat Sign emailed the signed FPOA to the signer. You can also find it in your Acrobat Sign account.
            </p>
          </div>
        )}
      </section>

      {/* Segment: tax forms */}
      <section
        id="segment-forms"
        aria-labelledby="tax-return-heading"
        className="scroll-mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="tax-return-heading" className="text-sm font-semibold text-gray-900">
                Tax forms by nexus
              </h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums">
                {nexusEntries.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-600">
              Add nexus regions and manage the eligible forms for each nexus from one place.
            </p>
          </div>
          <button onClick={onManageRegistrations} className={BTN_PRIMARY}>
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
                          <p className="whitespace-nowrap text-xs text-gray-500">
                            {row.registeredOn ? `Registered ${formatIsoDate(row.registeredOn)}` : `Saved ${formatDate(setup.savedAt)}`}
                          </p>
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
                        Add tax forms
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
        )}
      </section>

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
                Direct tax is filed only in the states you are registered in. Add your first registration to get started.
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
    description: 'Add the states where you file returns.',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5Z',
  },
  {
    title: 'Connect to Avalara',
    short: 'Connect Avalara',
    description: 'Link Avalara so it can file returns for you.',
    icon: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5Z',
  },
  {
    title: 'Sign the FPOA',
    short: 'Sign FPOA',
    description: 'Authorize Avalara to file on your behalf.',
    icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  },
  {
    title: 'Choose forms for each state',
    short: 'Tax forms',
    description: 'Pick the returns to file in each state.',
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
}: {
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

  return (
    <div>
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
      </div>
      <p className="mt-1 text-xs text-gray-600">{intro}</p>

      {/* One row per step: number · name and description · status or actions, right-aligned */}
      <ol className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200">
        {SETUP_STEPS.map((step, i) => {
          const isDone = done[i]
          const action = actions[i]
          const markDone = markable[i]
          const hint = hints[i]
          return (
            <li key={step.title} className="flex min-h-12 items-center gap-3 px-4 py-2">
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
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
              <p className="min-w-0 flex-1 text-sm">
                <span className={`font-medium ${isDone ? 'text-gray-500' : 'text-gray-900'}`}>{step.short}</span>
                <span className="sr-only">{isDone ? ' (completed)' : ' (not completed)'}</span>
                <span className="ml-2 text-xs text-gray-500">{step.description}</span>
              </p>
              <div className="flex flex-shrink-0 items-center gap-4">
                {isDone ? (
                  <span className="text-xs font-medium text-green-700">Completed</span>
                ) : (
                  <>
                    {markDone && (
                      <button onClick={markDone} className="text-xs font-medium text-gray-500 hover:text-gray-800 hover:underline">
                        Mark as completed
                      </button>
                    )}
                    {action ? (
                      <button onClick={action.onClick} className={BTN_XS_PRIMARY}>
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
            {/* Configure Direct Tax */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              {/* Header */}
              <div className="flex items-center gap-4 border-b border-gray-200 px-6 py-5">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-blue-600" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
                    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold text-gray-900">Configure Direct Return Filing</h1>
                  <h2 className="mt-0.5 text-sm font-normal text-gray-600">
                    Set up automatic direct tax calculation by integrating with Zoho Books or Avalara.
                  </h2>
                </div>
                <button onClick={onOpenSetup} className={BTN_PRIMARY}>
                  Set up Direct Return Filing
                </button>
              </div>

              {/* Body */}
              <div className="grid gap-8 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                <ul className="space-y-3">
                  {DIRECT_TAX_CARD_BENEFITS.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
                      <span className="text-sm leading-6 text-gray-800">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <TaxCalculationAccordion />
              </div>
            </div>

            {/* Setup progress */}
            <section className="rounded-lg border border-gray-200 bg-white px-5 py-4">
              <SetupChecklist
                done={setupDone}
                title="Setup progress"
                intro="Start with your tax registrations. Avalara files your direct tax returns automatically once all four steps are done."
                actions={{
                  0: { label: 'Add Tax Registration', onClick: () => onGoToRegistration(true) },
                  1: { label: 'Set up', onClick: onOpenSetup },
                }}
                markable={{ 0: onMarkRegistrationsDone }}
                hints={{ 2: 'After connecting', 3: 'After connecting' }}
              />
            </section>
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
    hasRegistrations && registrations.every((r) => (taxForms[r.code] ?? []).length > 0),
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
    backToTaxForms()
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
                  nexusRows={nexusRows}
                  questionnaire={questionnaire}
                  onQuestionnaireSubmit={(answers) => {
                    setQuestionnaire(answers)
                    // Every registered state stays listed; nexus states get the suggested forms.
                    setNexusRows((rows) =>
                      rows.map((r) =>
                        answers.nexus.includes(r.stateCode) ? { ...r, forms: suggestFormsFor(answers, r.stateCode) } : r,
                      ),
                    )
                  }}
                  onNexusRowsChange={setNexusRows}
                  onSaveFilingSetup={handleSaveForms}
                  onBack={backToTaxForms}
                />
              ) : appPage === 'active' ? (
                <DirectTaxActivePage
                  focus={activeSegment}
                  fpoaStatus={fpoaStatus}
                  fpoaSignedAt={fpoaSignedAt}
                  setups={setups}
                  onFpoaSign={handleFpoaSign}
                  onViewSetup={openFormsEditor}
                  onDisable={handleDisable}
                  onManageRegistrations={() => openTaxRegistration()}
                  setupDone={setupDone}
                  onMarkRegistrationsDone={() => setRegistrationsMarkedDone(true)}
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

    </div>
  )
}
