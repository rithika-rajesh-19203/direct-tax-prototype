import React from 'react'

/**
 * Navigation tree for the Direct Tax Settings screen.
 * Used by the canonical Nav component in AppShell.
 */

export interface NavItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  children?: NavItem[]
  active?: boolean
  expandable?: boolean
  expanded?: boolean
}

export interface NavSection {
  heading?: string
  items: NavItem[]
}

export const NAV_TREE: NavSection[] = [
  {
    heading: 'ORGANIZATION SETTINGS',
    items: [
      { label: 'Organization', href: '#' },
      { label: 'Users & Roles', href: '#' },
      {
        label: 'Taxes & Compliance',
        href: '#',
        expanded: true,
        children: [
          { label: 'Taxes', active: true, href: '#' },
        ],
      },
      { label: 'Setup & Configurations', href: '#' },
      { label: 'Customisation', href: '#' },
      { label: 'Automation', href: '#' },
    ],
  },
  {
    heading: 'MODULE SETTINGS',
    items: [
      { label: 'General', href: '#' },
      { label: 'Inventory', href: '#' },
      { label: 'Online Payments', href: '#' },
      { label: 'Sales', href: '#' },
      { label: 'Purchases', href: '#' },
      { label: 'Custom Modules', href: '#' },
    ],
  },
]

/**
 * Top navigation tabs for the Tax Returns Settings page.
 */
export const TAX_NAV_TABS = [
  { label: 'Tax Returns Settings', active: true },
  { label: 'Tax Rates' },
  { label: 'Tax Exemptions' },
  { label: 'Tax Agencies' },
  { label: 'Tax Preferences', badge: 'NEW' },
]

/**
 * Mock data for top bar actions and branding.
 * In a real app, this would come from API or props.
 */
export const TOP_BAR_CONFIG = {
  logo: null, // Would be brand logo
  title: 'Direct Tax Settings',
  actions: [], // Top bar actions like help, profile, etc.
}
