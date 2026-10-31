'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { UserButton, useUser } from '@clerk/nextjs'
import { api } from '@/lib/api'
import { AssistantPanel } from './AssistantPanel'
import {
  IconBell, IconBox, IconCases, IconChart, IconChevronRight, IconDashboard, IconFlame, IconGrid, IconMail,
  IconMenu, IconOrder, IconPlus, IconSearch, IconSettings, IconShield, IconSpark, IconSidebar, IconTruck,
  IconUpload, IconUsers,
} from './icons'

type CaseLite = { id: string; customer_name?: string | null; customer_id: string; customer_message: string; status: string; created_at: string }
type NavItem = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; tab?: string; badge?: 'open' | 'customers' | 'running' }

const workspaceNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { href: '/cases', label: 'Cases', icon: IconCases, badge: 'open' },
  { href: '/agent-runs', label: 'Agent Runs', icon: IconSpark, badge: 'running' },
  { href: '/explorer?tab=customers', label: 'Customers', icon: IconUsers, tab: 'customers', badge: 'customers' },
  { href: '/explorer?tab=orders', label: 'Orders', icon: IconOrder, tab: 'orders' },
  { href: '/explorer?tab=inventory', label: 'Inventory', icon: IconBox, tab: 'inventory' },
  { href: '/fulfillment', label: 'Fulfillment', icon: IconTruck },
  { href: '/analytics', label: 'Analytics', icon: IconChart },
]
const operationsNav: NavItem[] = [
  { href: '/policies', label: 'Policies', icon: IconShield },
  { href: '/communications', label: 'Communications', icon: IconMail },
  { href: '/imports', label: 'Import center', icon: IconUpload },
  { href: '/onboarding', label: 'Workspace settings', icon: IconSettings },
]
const titles: [string, string][] = [
  ['/dashboard', 'Dashboard'], ['/cases/new', 'New Case'], ['/cases/', 'Case detail'], ['/cases', 'Cases'],
  ['/agent-runs', 'Agent Runs'], ['/explorer', 'Data explorer'], ['/fulfillment', 'Fulfillment'], ['/analytics', 'Analytics'],
  ['/policies', 'Policies'], ['/communications', 'Communications'], ['/imports', 'Import center'], ['/onboarding', 'Workspace settings'],
]

const DONE = ['resolved', 'verified', 'completed']
const ALERT = ['failed', 'blocked', 'escalated']
const RUNNING = ['running', 'replanning', 'processing']
const lower = (s: string) => String(s || '').toLowerCase()
const tones = ['red', 'amber', 'blue', 'orange', 'green', 'violet']
export const toneFor = (seed: string) => tones[[...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0) % tones.length]

// Module-level state survives client-side navigation, so the intro plays once per visit
// and the sidebar does not refetch on every page change.
let introPlayed = false
let sidebarCache: { at: number; cases: CaseLite[]; customers: number } | null = null

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('resolveai_theme') as 'dark' | 'light' | null
      const initial = saved || 'dark'
      setTheme(initial)
      document.documentElement.setAttribute('data-theme', initial)
    } catch {}
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem('resolveai_theme', next)
      document.documentElement.setAttribute('data-theme', next)
    } catch {}
  }

  const [activeTab, setActiveTab] = useState('customers')
  const { isLoaded, isSignedIn, user } = useUser()
  const setupComplete = (user?.unsafeMetadata as Record<string, unknown> | undefined)?.resolveaiSetupComplete === true
  const [intro] = useState(() => !introPlayed)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [assistOpen, setAssistOpen] = useState(false)
  const [cases, setCases] = useState<CaseLite[]>(sidebarCache?.cases || [])
  const [customerCount, setCustomerCount] = useState(sidebarCache?.customers ?? 0)

  // Sync the explorer tab from the URL (same behaviour as before the redesign).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setActiveTab(new URLSearchParams(window.location.search).get('tab') || 'customers') }, [pathname])
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn && !['/sign-in', '/sign-up', '/'].includes(pathname)) { router.replace('/sign-in'); return }
    if (isSignedIn && pathname !== '/onboarding' && !setupComplete && !['/', '/sign-in', '/sign-up'].includes(pathname)) { router.replace('/onboarding'); return }
    if (isSignedIn && setupComplete && pathname === '/onboarding') router.replace('/dashboard')
  }, [isLoaded, isSignedIn, setupComplete, pathname, router])
  // Read the saved sidebar width after hydration so server and client markup match.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { try { setCollapsed(localStorage.getItem('ra-sidebar-collapsed') === '1') } catch {} }, [])
  useEffect(() => { if (intro) introPlayed = true }, [intro])
  useEffect(() => {
    if (!isSignedIn || !setupComplete) return
    if (sidebarCache && Date.now() - sidebarCache.at < 30000) return
    let active = true
    Promise.all([api.getCases(), api.getCustomers()]).then(([c, cu]) => {
      if (!active) return
      sidebarCache = { at: Date.now(), cases: c, customers: cu.length }
      setCases(c); setCustomerCount(cu.length)
    }).catch(() => {})
    return () => { active = false }
  }, [isSignedIn, setupComplete])

  function toggleCollapsed() {
    setCollapsed(c => { try { localStorage.setItem('ra-sidebar-collapsed', c ? '0' : '1') } catch {} return !c })
  }
  function isActive(item: NavItem) {
    if (item.tab) return pathname === '/explorer' && activeTab === item.tab
    if (item.href === '/cases') return pathname === '/cases' || (pathname.startsWith('/cases/') && pathname !== '/cases/new')
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  if (pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) return <>{children}</>
  if (!isLoaded || !isSignedIn || (!setupComplete && pathname !== '/onboarding'))
    return (
      <main className="fl-auth-loading">
        <span className="fl-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image src="/logo.png" alt="ResolveAI Logo" width={32} height={32} style={{ borderRadius: 8, objectFit: 'contain' }} />
          ResolveAI
        </span>
        <p>Checking workspace access…</p>
      </main>
    )

  const openCount = cases.filter(c => !DONE.includes(lower(c.status))).length
  const runningCount = cases.filter(c => RUNNING.includes(lower(c.status))).length
  const alertCount = cases.filter(c => ALERT.includes(lower(c.status))).length
  const recent = [...cases].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4)
  const title = titles.find(([p]) => pathname === p || pathname.startsWith(p))?.[1] || 'Workspace'
  const badgeFor = (item: NavItem) => {
    if (item.badge === 'open' && openCount) return <span className="fl-badge blue">{openCount}</span>
    if (item.badge === 'customers' && customerCount) return <span className="fl-badge green">{customerCount > 99 ? '99+' : customerCount}</span>
    if (item.badge === 'running' && runningCount) return <span className="fl-badge-flame" title={runningCount + ' agent run in progress'}><IconFlame/></span>
    return null
  }
  let n = 0
  const renderItem = (item: NavItem) => {
    const active = isActive(item)
    return <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} style={{ ['--i' as string]: n++ }}
      onClick={() => { if (item.tab) setActiveTab(item.tab); setMobileOpen(false) }} className={'fl-nav-item' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined}>
      <item.icon className="fl-nav-icon"/><span className="fl-nav-label">{item.label}</span>{badgeFor(item)}
    </Link>
  }
  const name = user?.fullName || user?.firstName || 'Workspace member'
  const email = user?.primaryEmailAddress?.emailAddress || ''

  return <div className={'fl-shell' + (intro ? ' fl-intro' : '') + (collapsed ? ' is-collapsed' : '') + (mobileOpen ? ' nav-open' : '')}>
    <div className="fl-nav-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true"/>
    <aside className="fl-sidebar">
      <div className="fl-sidebar-head">
        <Link href="/dashboard" className="fl-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <Image src="/logo.png" alt="ResolveAI Logo" width={28} height={28} style={{ borderRadius: 6, objectFit: 'contain' }} priority />
          <span className="fl-logo-text">ResolveAI</span>
        </Link>
        <button className="fl-icon-btn ghost fl-collapse" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><IconSidebar/></button>
      </div>
      <nav className="fl-nav" aria-label="Workspace navigation">
        <div className="fl-nav-group" style={{ ['--i' as string]: n++ }}><i/>Workspace</div>
        {workspaceNav.map(renderItem)}
        <div className="fl-nav-group" style={{ ['--i' as string]: n++ }}><i/>Operations</div>
        {operationsNav.map(renderItem)}
      </nav>
      <div className="fl-sidebar-foot">
        <div className="fl-runs" style={{ ['--i' as string]: n++ }}>
          <div className="fl-nav-group flat"><i/>Recent cases<Link href="/cases/new" className="fl-mini-btn" aria-label="Open a new case"><IconPlus/></Link></div>
          {recent.length === 0 ? <p className="fl-runs-empty">Cases you open appear here.</p> : recent.map(c =>
            <Link key={c.id} href={'/cases/' + c.id} className="fl-run" onClick={() => setMobileOpen(false)}>
              <span className={'fl-square tone-' + toneFor(c.customer_name || c.customer_id)}>{(c.customer_name || c.customer_id || 'C').slice(0, 1)}</span>
              <span className="fl-run-text">{c.customer_message || c.id}</span>
              <IconChevronRight className="fl-run-chev"/>
            </Link>)}
        </div>
        <div className="fl-plan" style={{ ['--i' as string]: n++ }}>
          <strong>Workspace setup</strong>
          <p>Keep records and policies current so the agent decides on real data.</p>
          <Link href="/imports" className="fl-plan-btn">Import records</Link>
        </div>
        <div className="fl-me" style={{ ['--i' as string]: n++ }}>
          <UserButton afterSignOutUrl="/sign-in"/>
          <span><strong>{name}</strong><small>{email}</small></span>
        </div>
      </div>
    </aside>

    <div className="fl-main">
      <header className="fl-topbar">
        <button className="fl-icon-btn ghost fl-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><IconMenu/></button>
        <div className="fl-crumb"><IconGrid/><span>{title}</span></div>
        <label className="fl-search">
          <IconSearch/>
          <input aria-label="Search cases" placeholder="Search for something…" onKeyDown={e => { if (e.key === 'Enter') router.push('/cases') }}/>
        </label>
        <button
          className={'fl-ask' + (assistOpen ? ' active' : '')}
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-chutku'))
            }
          }}
          aria-expanded={assistOpen}
        >
          <IconSpark/>Ask Chutku AI
        </button>
                <button
          className="fl-icon-btn ghost"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
          aria-label="Toggle theme"
          style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
        <Link href="/cases" className="fl-icon-btn fl-bell" aria-label={alertCount ? alertCount + ' cases need attention' : 'No cases need attention'}>
          <IconBell/>{alertCount > 0 && <i/>}
        </Link>
      </header>
      <div className="fl-content">{children}</div>
    </div>
    <AssistantPanel open={assistOpen} onClose={() => setAssistOpen(false)}/>
  </div>
}
