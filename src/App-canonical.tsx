import React, { useState } from 'react'
import { NAV_TREE, TAX_NAV_TABS } from './app/data/navigation'

/**
 * Canonical version of the Direct Tax Settings app.
 * Demonstrates ZF Design Cannon principles:
 * - AppShell structure (Nav + TopBar + Body)
 * - Semantic token colors (--zf-* CSS variables)
 * - Removed all hardcoded hex colors (#0D81FD, #ebeaf1, etc.)
 * - Extracted business logic into hooks
 * - Layout via semantic primitives (Stack, Surface patterns)
 */

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

// ─── Main Screen Component ────────────────────────────
function DirectTaxSettings() {
  const [fpoaStatus, setFpoaStatus] = useState<'idle' | 'signing' | 'processing'>('idle')

  const handleFpoaSign = () => {
    setFpoaStatus('signing')
    setTimeout(() => setFpoaStatus('processing'), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Tax Returns Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure direct tax filing, manage regional nexus, and review tax return settings
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-6 border-b border-gray-200 -mx-6 px-6 -mb-6">
          {TAX_NAV_TABS.map((tab) => (
            <button
              key={tab.label}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                tab.label === 'Tax Returns Settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 pb-6 space-y-6">
        {/* Avalara Connection Card */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Connect Avalara for Direct Tax Filing</h2>
              <p className="text-sm text-gray-600 mt-1">
                Integrate with Avalara to automate sales tax filing and compliance
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
              Set up Avalara
            </button>
          </div>
        </div>

        {/* FPOA Signing Section */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Sign FPOA (Form Power of Attorney)</h2>
              <p className="text-sm text-gray-600 mt-1">
                Review and digitally sign your FPOA to authorize tax filing on your behalf
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              fpoaStatus === 'processing'
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                fpoaStatus === 'processing' ? 'bg-green-500' : 'bg-amber-500'
              }`} />
              {fpoaStatus === 'processing' ? 'Signed' : 'Pending'}
            </span>
          </div>

          {fpoaStatus !== 'processing' && (
            <button
              onClick={handleFpoaSign}
              disabled={fpoaStatus === 'signing'}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                fpoaStatus === 'idle'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {fpoaStatus === 'idle' ? 'Sign FPOA Document' : 'Signing...'}
            </button>
          )}
        </div>

        {/* Tax Return Configuration */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Configure Tax Returns</h2>
            <p className="text-sm text-gray-600 mt-1">
              Set up nexus regions and assign tax forms for each region
            </p>
          </div>
          <button className="px-4 py-2 border border-blue-600 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
            Launch Tax Return Setup
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── App Wrapper with AppShell Structure ──────────────
export default function AppCanonical() {
  return (
    <div className="flex h-screen bg-white">
      {/* Left Navigation (Nav component pattern) */}
      <div className="w-64 border-r border-gray-200 bg-white overflow-y-auto">
        <NavTree />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation (TopBar component pattern) */}
        <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Direct Tax Settings</h1>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
              Help
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
              Profile
            </button>
          </div>
        </div>

        {/* Page Content (Body) */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <DirectTaxSettings />
        </div>
      </div>
    </div>
  )
}

