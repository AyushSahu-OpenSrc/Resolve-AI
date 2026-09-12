'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const icons = {
  home: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  cases: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
      <path d="m9 16 2 2 4-4"/>
    </svg>
  ),
  plus: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
  ),
  database: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
      <path d="M3 12A9 3 0 0 0 21 12"/>
    </svg>
  ),
  chart: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="18" y1="20" y2="10"/>
      <line x1="12" x2="12" y1="20" y2="4"/>
      <line x1="6" x2="6" y1="20" y2="14"/>
    </svg>
  ),
}

const navItems = [
  { href: '/',          label: 'Overview',      icon: icons.home },
  { href: '/cases',     label: 'Cases',         icon: icons.cases },
  { href: '/cases/new', label: 'New Case',      icon: icons.plus },
  { href: '/explorer',  label: 'Data Explorer', icon: icons.database },
  { href: '/analytics', label: 'Analytics',     icon: icons.chart },
]

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="app-shell">
      <nav className="nav-rail">
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem', flexShrink: 0, width: '100%', padding: '0 1.0625rem' }}>
          <div className="nav-logo" style={{ flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'IBM Plex Mono, monospace' }}>R</span>
          </div>
          <span className="nav-rail-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.01em' }}>
            ResolveAI
          </span>
        </Link>

        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-rail-item ${isActive(item.href) ? 'active' : ''}`}
            title={item.label}
          >
            <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
            <span className="nav-rail-label">{item.label}</span>
          </Link>
        ))}

        {/* Version / bottom area */}
        <div style={{ marginTop: 'auto', padding: '0 1.0625rem', width: '100%' }}>
          <div className="nav-rail-label" style={{
            fontSize: '0.5625rem',
            fontFamily: 'IBM Plex Mono, monospace',
            color: 'var(--ink-faint)',
            letterSpacing: '0.04em',
          }}>
            Tech Zephyr 4.0
          </div>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
