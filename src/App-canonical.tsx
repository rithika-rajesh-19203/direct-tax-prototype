import React, { useState, useRef } from 'react'
import { NAV_TREE, TAX_NAV_TABS } from './app/data/navigation'

/**
 * Canonical version of the Direct Tax Settings app.
 * Complete workflow replication from deployed v1.0 with:
 * - Avalara connection modal
 * - FPOA signing wizard (2-step: Sign FPOA → Tax Return)
 * - Tax return configuration modal with nexus regions
 * - All states, transitions, and interactions
 */

type AppPage = 'overview' | 'wizard' | 'region-details'
type SetupWizardStep = 1 | 2
type FpoaStatus = 'idle' | 'signing' | 'processing'

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

const STATE_FORMS: Record<string, string[]> = {
  Alabama: ['AL Form 2210AL', 'AL BPT-IN'],
  Arizona: ['AZ Form 120', 'AZ TPT-2'],
  California: ['CA Form 568', 'CA BOE-401-A'],
  'New York': ['NY CT-3', 'NY ST-100'],
}

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
                <button className={`w-full text-left px-2 py-2 rounded text-sm transition-colors ${
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
                        className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                          child.active
                            ? 'bg-blue-600 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur">
      <div className="bg-white w-[440px] max-h-[86vh] overflow-hidden border border-gray-200 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 pt-4 pb-4 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200">
                <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
                  <defs>
                    <linearGradient id="avalaraIconGradient" x1="24" y1="6" x2="24" y2="40" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#6F8FEF" />
                      <stop offset="1" stopColor="#5B79E6" />
                    </linearGradient>
                  </defs>
                  <path d="M24 5.5 4.5 39.5h39L24 5.5Z" fill="url(#avalaraIconGradient)" />
                  <path d="M24 13.5 11.5 35h25L24 13.5Z" fill="#FFFFFF" fillOpacity="0.18" />
                  <rect x="22" y="18" width="4" height="11" rx="2" fill="#FFFFFF" />
                  <rect x="21.75" y="31.5" width="4.5" height="4.5" rx="2.25" fill="#FFFFFF" />
                </svg>
              </div>
              <div className="pt-0.5">
                <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs uppercase tracking-wider text-blue-600">
                  Avalara integration
                </div>
                <h2 className="text-base font-semibold text-gray-900 leading-tight">
                  Connect To Avalara
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-gray-600 max-w-xs">
                  Avalara automates sales tax filing so you can stay compliant without the manual overhead.
                </p>
              </div>
            </div>
            <button onClick={onCancel} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-1">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
          {/* Warning Box */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="mb-3 flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-amber-600 border border-amber-300">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                  <path d="M12 2 1 21h22L12 2Zm1 14h-2v-2h2v2Zm0-4h-2V8h2v4Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
                  Before you proceed
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Review how filing will be handled once Avalara is connected.
                </p>
              </div>
            </div>

            <ul className="space-y-2.5">
              <li className="flex items-start gap-3 rounded-lg bg-white px-3 py-3 border border-amber-100">
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                <p className="text-xs leading-5 text-gray-700">
                  Zoho Books supports direct tax filing through its integration with Avalara, our certified service provider.
                </p>
              </li>
              <li className="flex items-start gap-3 rounded-lg bg-white px-3 py-3 border border-amber-100">
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                <p className="text-xs leading-5 text-gray-700">
                  Avalara handles tax compliance and filing on your behalf so you can focus on your business.
                </p>
              </li>
            </ul>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-4 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded accent-blue-600"
            />
            <span className="text-xs leading-5 text-gray-700">
              I agree to the terms of Zoho Books and Avalara and wish to proceed with the connection.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3.5 flex items-center gap-2.5 bg-white">
          <button
            onClick={understood ? onConnect : undefined}
            disabled={!understood}
            className={`min-w-[104px] px-5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              understood
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Proceed
          </button>
          <button
            onClick={onCancel}
            className="min-w-[96px] px-5 py-2.5 rounded-lg text-xs text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <div className="ml-auto text-xs text-gray-500">
            Secure connection setup
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FPOA Wizard Modal ────────────────────────────────
function SetupWizardModal({
  wizardStep,
  fpoaStatus,
  nexusRows,
  onFpoaSign,
  onNext,
  onSaveFilingSetup,
  onBack,
}: {
  wizardStep: SetupWizardStep
  fpoaStatus: FpoaStatus
  nexusRows: NexusRow[]
  onFpoaSign: () => void
  onNext: () => void
  onSaveFilingSetup: () => void
  onBack: () => void
}) {
  const canMoveNext = fpoaStatus !== 'idle'
  const [removeForm, setRemoveForm] = useState<{ rowId: string; form: string } | null>(null)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur">
      <div className="bg-white w-[900px] max-h-[92vh] overflow-hidden border border-gray-200 rounded-lg flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {wizardStep === 1 ? 'Configure tax return' : 'Configure Tax Return For Your Business'}
              </h3>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                {wizardStep === 1
                  ? 'Complete the setup flow to sign the FPOA and configure tax returns for each nexus region.'
                  : 'Add as many nexus regions as you need and assign eligible forms for each region before moving to the configure nexus screen.'}
              </p>
            </div>
            <button onClick={onBack} className="text-xs text-blue-600 hover:underline flex-shrink-0">
              Back
            </button>
          </div>

          {/* Steps Indicator */}
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

                    {/* Overlay Modal */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-transparent to-black/10 p-6">
                      <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white/95 px-8 py-6 text-center shadow-2xl backdrop-blur-sm">
                        <p className="text-xs font-medium text-gray-900">
                          {fpoaStatus === 'idle'
                            ? 'Open the document and add your digital signature'
                            : fpoaStatus === 'signing'
                              ? 'Your signature is being applied'
                              : 'FPOA signed successfully'}
                        </p>
                        <p className="mt-1 text-xs leading-4 text-gray-600">
                          {fpoaStatus === 'processing'
                            ? 'You can continue to the next step and configure tax return details.'
                            : 'Use the CTA below to complete the signing flow inside this document.'}
                        </p>
                        <button
                          onClick={onFpoaSign}
                          disabled={fpoaStatus !== 'idle'}
                          className={`mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-medium transition-colors ${
                            fpoaStatus === 'idle'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                          {fpoaStatus === 'idle' ? 'Sign FPOA digitally' : fpoaStatus === 'signing' ? 'Applying signature' : 'Signed'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onNext}
                  disabled={!canMoveNext}
                  className={`inline-flex min-w-[136px] items-center justify-center rounded-lg px-9 py-3 text-xs font-medium transition-colors ${
                    canMoveNext
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            // Step 2: Tax Return Configuration
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-blue-600">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm0 16H5V5h14v14ZM7 7h10v2H7V7Zm0 4h10v2H7v-2Zm0 4h6v2H7v-2Z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-600">Questionnaire complete.</p>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline flex-shrink-0">
                    View questionnaire
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-medium text-gray-900">Configure Nexus & Tax Forms</h4>
                <p className="text-xs text-gray-600">
                  Based on your answers, we've suggested the nexus states and tax forms below. Review, modify, or add new nexus entries.
                </p>

                <div className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  Auto-suggested from your questionnaire
                </div>
                <span className="text-xs text-gray-500">{nexusRows.length} nexus state{nexusRows.length !== 1 ? 's' : ''}</span>

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
                        <button className="text-gray-300 hover:text-red-400 transition-colors">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                      <div className="ml-10 flex flex-wrap gap-1.5">
                        {row.forms.map((form) => (
                          <span
                            key={form}
                            className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-600 text-xs px-2.5 py-0.5 rounded-full"
                          >
                            {form}
                            <button className="text-blue-600 hover:text-blue-700">
                              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                              </svg>
                            </button>
                          </span>
                        ))}
                        <button className="text-xs text-blue-600 hover:underline">
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
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-6 py-2.5 text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Save filing setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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

// ─── Main Screen Component ────────────────────────────
function DirectTaxSettings({
  onOpenSetup,
}: {
  onOpenSetup: () => void
}) {
  const [selectedSection, setSelectedSection] = useState<string>('direct-tax')

  return (
    <div className="flex h-full gap-0">
      {/* Middle Column - Section List */}
      <div className="w-64 border-r border-gray-200 bg-white p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 px-2">Taxes</h2>
        <div className="space-y-1">
          {TAX_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
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
      <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        {selectedSection === 'direct-tax' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 pb-6">
              <div>
                <h1 className="text-base font-semibold text-gray-900">Tax Settings</h1>
                <p className="text-xs text-gray-600 mt-1">
                  Configure direct tax filing, manage regional nexus, and review tax return settings
                </p>
              </div>

              {/* Tabs */}
              <div className="flex gap-6 mt-6 border-b border-gray-200">
                {TAX_NAV_TABS.map((tab) => (
                  <button
                    key={tab.label}
                    className={`py-3 border-b-2 text-xs font-medium transition-colors ${
                      tab.label === 'Tax Returns Settings'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                    {tab.badge && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-gray-400">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">Configure Direct Tax !</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Set up automatic direct tax calculation by integrating with Zoho Books or Avalara.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {DIRECT_TAX_CARD_BENEFITS.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />
                        <span className="text-xs text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={onOpenSetup}
                  className="flex-shrink-0 px-5 py-2.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Set up Direct Tax
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedSection !== 'direct-tax' && (
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
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
export default function AppCanonical() {
  const [appPage, setAppPage] = useState<AppPage>('overview')
  const [showAvalaraModal, setShowAvalaraModal] = useState(false)
  const [wizardStep, setWizardStep] = useState<SetupWizardStep>(1)
  const [fpoaStatus, setFpoaStatus] = useState<FpoaStatus>('idle')
  const [nexusRows] = useState<NexusRow[]>([
    { id: 'AL', state: 'Alabama', stateCode: 'AL', forms: ['AL Form 2210AL', 'AL BPT-IN'] },
    { id: 'AZ', state: 'Arizona', stateCode: 'AZ', forms: ['AZ Form 120', 'AZ TPT-2'] },
    { id: 'CA', state: 'California', stateCode: 'CA', forms: ['CA Form 568', 'CA BOE-401-A'] },
    { id: 'NY', state: 'New York', stateCode: 'NY', forms: ['NY CT-3', 'NY ST-100'] },
  ])

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
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded transition-colors">
              Help
            </button>
            <button className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded transition-colors">
              Profile
            </button>
          </div>
        </div>

        {/* Page Content - Flex Container for 3-column layout */}
        <div className="flex-1 overflow-hidden flex">
          <DirectTaxSettings onOpenSetup={handleOpenSetup} />
        </div>
      </div>

      {/* Modals */}
      {showAvalaraModal && (
        <AvalaraModal
          onConnect={handleAvalalaConnect}
          onCancel={() => setShowAvalaraModal(false)}
        />
      )}

      {appPage === 'wizard' && (
        <SetupWizardModal
          wizardStep={wizardStep}
          fpoaStatus={fpoaStatus}
          nexusRows={nexusRows}
          onFpoaSign={handleFpoaSign}
          onNext={handleWizardNext}
          onSaveFilingSetup={() => {
            setAppPage('overview')
          }}
          onBack={() => {
            setAppPage('overview')
            setWizardStep(1)
            setFpoaStatus('idle')
          }}
        />
      )}
    </div>
  )
}
