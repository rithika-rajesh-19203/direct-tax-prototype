import { Suspense, useEffect, useRef, useState } from 'react'
import { VERSIONS, type PrototypeVersion } from './versions/registry'

const STORAGE_KEY = 'prototype-version'

// The URL (?v=v1.0) wins so a version can be linked; otherwise the last pick is remembered.
function initialVersionId(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('v')
  if (fromUrl && VERSIONS.some((v) => v.id === fromUrl)) return fromUrl
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && VERSIONS.some((v) => v.id === saved)) return saved
  } catch {
    // Storage unavailable; fall back to the latest version.
  }
  return VERSIONS[0].id
}

function VersionSwitcher({ current, onChange }: { current: PrototypeVersion; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Prototype version: ${current.label}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-gray-500" aria-hidden="true">
          <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18Zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12Z" />
        </svg>
        {current.label}
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 fill-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[60] mt-1.5 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <p className="border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-500">Prototype versions</p>
          <ul role="listbox" aria-label="Prototype versions" className="py-1">
            {VERSIONS.map((v) => {
              const selected = v.id === current.id
              return (
                <li key={v.id} role="option" aria-selected={selected}>
                  <button
                    onClick={() => {
                      onChange(v.id)
                      setOpen(false)
                    }}
                    className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-gray-50 ${
                      selected ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 fill-blue-600 ${selected ? '' : 'invisible'}`}
                      aria-hidden="true"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{v.label}</span>
                        <span className="text-xs text-gray-500">{v.date}</span>
                      </span>
                      <span className="block text-xs text-gray-500">{v.summary}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function VersionRoot() {
  const [versionId, setVersionId] = useState(initialVersionId)
  const version = VERSIONS.find((v) => v.id === versionId) ?? VERSIONS[0]

  const changeVersion = (id: string) => {
    setVersionId(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // Not remembered across reloads; the switch still works.
    }
    const url = new URL(window.location.href)
    url.searchParams.set('v', id)
    window.history.replaceState(null, '', url)
  }

  const App = version.App
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-gray-500">Loading {version.label}…</div>}>
      {/* key: each version starts with fresh state */}
      <App key={version.id} headerSlot={<VersionSwitcher current={version} onChange={changeVersion} />} />
    </Suspense>
  )
}
