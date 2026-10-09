import { lazy, type ComponentType, type ReactNode } from 'react'

type VersionApp = ComponentType<{ headerSlot?: ReactNode }>

export type PrototypeVersion = {
  id: string
  label: string
  date: string
  summary: string
  App: VersionApp
}

// Newest first. To release a version: copy src/App-canonical.tsx into
// src/versions/, fix its relative imports, and add an entry here.
export const VERSIONS: PrototypeVersion[] = [
  {
    id: 'v5.0',
    label: 'v5.0',
    date: 'In progress',
    summary: 'No Disable button once Direct Return Filing is on',
    App: lazy(() => import('../App-canonical')),
  },
  {
    id: 'v4.0',
    label: 'v4.0',
    date: 'Oct 9, 2026',
    summary: 'FPOA before bank, questionnaire card, tax forms grouped by state',
    App: lazy(() => import('./v4-0')),
  },
  {
    id: 'v3.0',
    label: 'v3.0',
    date: 'Oct 6, 2026',
    summary: 'Bank account step, FPOA in a PDF modal, quick save, delink states',
    App: lazy(() => import('./v3-0')),
  },
  {
    id: 'v2.0',
    label: 'v2.0',
    date: 'Oct 6, 2026',
    summary: 'Compact Configure card so the setup steps lead; version switcher',
    App: lazy(() => import('./v2-0')),
  },
  {
    id: 'v1.0',
    label: 'v1.0',
    date: 'Oct 5, 2026',
    summary: 'Direct Return Filing setup, tax registrations, real FPOA signing',
    App: lazy(() => import('./v1-0')),
  },
  {
    id: 'public-oct-1',
    label: 'Public build',
    date: 'Oct 1, 2026',
    summary: 'Version on the public GitHub Pages link, before v1.0',
    App: lazy(() => import('./public-2026-10-01')),
  },
  {
    id: 'onslate-sep-29',
    label: 'Onslate prototype',
    date: 'Sep 29, 2026',
    summary: 'Earlier prototype from direct-tax-prototype-mdyrqkyj.onslate.in',
    App: lazy(() => import('./onslate-2026-09-29')),
  },
]
