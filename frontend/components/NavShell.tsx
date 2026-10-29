'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '▦' },
  { href: '/cases', label: 'Conflicts', icon: '◇' },
  { href: '/cases/new', label: 'Create case', icon: '+' },
  { href: '/explorer', label: 'Customers & orders', icon: '♧' },
  { href: '/imports', label: 'Import center', icon: '⇧' },
  { href: '/policies', label: 'Policy engine', icon: '▤' },
  { href: '/agent-runs', label: 'Agent runs', icon: '✧' },
  { href: '/fulfillment', label: 'Fulfillment', icon: '▱' },
  { href: '/communications', label: 'Communications', icon: '✉' },
  { href: '/analytics', label: 'Analytics', icon: '▥' },
]

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isLoaded, isSignedIn, user } = useUser()
  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return <div className="ra-shell">
    <aside className="ra-sidebar">
      <Link href="/" className="ra-brand"><span className="ra-brand-mark">R</span><span>Resolve<span className="ra-brand-accent">AI</span><small>RESOLUTION OPERATIONS</small></span></Link>
      <div className="ra-workspace-label">WORKSPACE</div>
      <nav className="ra-nav">{navItems.map(item => <Link key={item.href} href={item.href} className={`ra-nav-item ${isActive(item.href) ? 'active' : ''}`}><span className="ra-nav-icon">{item.icon}</span><span>{item.label}</span>{item.href === '/cases' && <span className="ra-nav-badge">•</span>}</Link>)}</nav>
      <div className="ra-sidebar-bottom"><div className="ra-agent-status"><span className="ra-status-dot"/><span><strong>Agent system</strong><small>Connected to workspace API</small></span></div><Link href="/onboarding" className="ra-upgrade"><span className="ra-upgrade-icon">✦</span><strong>Workspace setup</strong><small>Connect your data and policies</small><span className="ra-upgrade-arrow">↗</span></Link><div className="ra-sidebar-foot">RESOLVEAI · EARLY ACCESS</div></div>
    </aside>
    <main className="ra-main">
      <header className="ra-topbar"><div className="ra-search"><span>⌕</span><input aria-label="Search workspace" placeholder="Search customers, orders, cases, policies…" onKeyDown={e => { if(e.key === 'Enter') window.location.href = '/cases' }} /></div><div className="ra-topbar-right"><span className="ra-plan"><span className="ra-plan-mark">✧</span><span><strong>{user?.organizationMemberships?.[0]?.organization?.name || 'My workspace'}</strong><small>Resolution workspace</small></span></span><span className="ra-topbar-divider"/>{isLoaded && isSignedIn ? <div className="ra-user"><span><strong>{user.fullName || user.primaryEmailAddress?.emailAddress || 'Workspace user'}</strong><small>Workspace member</small></span><UserButton afterSignOutUrl="/sign-in" /></div> : <Link href="/sign-in" className="ra-signin-link">Sign in ↗</Link>}</div></header>
      {children}
    </main>
  </div>
}
