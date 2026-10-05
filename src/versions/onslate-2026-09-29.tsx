import type { ReactNode } from 'react'

// Archived copy of https://direct-tax-prototype-mdyrqkyj.onslate.in/ (built Sep 29, 2026).
// That site blocks embedding, so its build is kept in public/versions/onslate-2026-09-29/.
const ARCHIVE_URL = `${import.meta.env.BASE_URL}versions/onslate-2026-09-29/index.html`
const SOURCE_URL = 'https://direct-tax-prototype-mdyrqkyj.onslate.in/'

export default function OnslateArchive({ headerSlot }: { headerSlot?: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex h-11 flex-shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-gray-50 px-4">
        <p className="min-w-0 truncate text-xs text-gray-600">
          <span className="font-medium text-gray-900">Archived version</span> · Onslate prototype, Sep 29, 2026 ·{' '}
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            Open original
          </a>
        </p>
        {headerSlot}
      </div>
      <iframe title="Onslate prototype (Sep 29, 2026)" src={ARCHIVE_URL} className="w-full flex-1 border-0" />
    </div>
  )
}
