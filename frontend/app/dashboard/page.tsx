'use client'

import { useCallback, useEffect, useState, type ComponentType, type SVGProps } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { NavShell, toneFor } from '@/components/NavShell'
import { api } from '@/lib/api'
import { DiagramModal, type DiagramType } from '@/components/DiagramModal'
import { useCountUp } from '@/hooks/useCountUp'
import {
  IconAlert,
  IconBox,
  IconCalendar,
  IconCases,
  IconClock,
  IconInfo,
  IconMic,
  IconPlus,
  IconRefresh,
  IconShield,
  IconTrendUp,
  IconUpload,
  IconUsers,
} from '@/components/icons'

type CaseRow = {
  id: string
  customer_id: string
  customer_name?: string | null
  order_id: string
  customer_message: string
  status: string
  resolution_summary?: string | null
  created_at: string
  updated_at: string
}
type Row = Record<string, unknown>

const DONE = ['resolved', 'verified', 'completed']
const ALERT = ['failed', 'blocked', 'escalated']
const RUNNING = ['running', 'replanning', 'processing']
const lower = (s: unknown) => String(s || '').toLowerCase()
const nice = (v: unknown) => String(v || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const parse = (v?: string) => { if (!v) return NaN; return new Date(v + (/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? '' : 'Z')).getTime() }
function ago(v: string | undefined, now: number) {
  const t = parse(v); if (Number.isNaN(t) || !now) return '—'
  const m = Math.max(0, Math.round((now - t) / 60000))
  if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'
  const h = Math.round(m / 60); if (h < 24) return h + 'hr ago'
  const d = Math.round(h / 24); if (d < 7) return d + (d === 1 ? ' day ago' : ' days ago')
  const w = Math.round(d / 7); return w + (w === 1 ? ' week ago' : ' weeks ago')
}
function statusKind(s: string) { const v = lower(s); return DONE.includes(v) ? 'good' : RUNNING.includes(v) ? 'working' : ALERT.includes(v) ? 'alert' : 'open' }
const available = (i: Row) => Number(i.available ?? (Number(i.quantity || 0) - Number(i.reserved_quantity || 0)))

type StatProps = { label: string; value: number; decimals?: number; suffix?: string; note: string; tone: 'up' | 'down' | 'flat'; help: string; loading: boolean; icon: ComponentType<SVGProps<SVGSVGElement>>; index: number }
function StatCard({ label, value, decimals = 0, suffix = '', note, tone, help, loading, icon: Icon, index }: StatProps) {
  const shown = useCountUp(value, !loading)
  return <article className="fl-stat fl-rise" style={{ ['--d' as string]: 0.18 + index * 0.07 + 's' }}>
    <div className="fl-stat-inner">
      <span className="fl-stat-icon"><Icon /></span>
      <div><small>{label}</small>
        {loading ? <span className="fl-skel" style={{ width: 64, height: 22, marginTop: 6 }} /> :
          <strong>{shown.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</strong>}
      </div>
    </div>
    <footer className={'fl-stat-foot ' + tone}>
      <span className="fl-dot-ring" />{loading ? 'Loading…' : note}
      <span className="fl-help" title={help} aria-label={help}><IconInfo /></span>
    </footer>
  </article>
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [cases, setCases] = useState<CaseRow[]>([])
  const [customers, setCustomers] = useState<Row[]>([])
  const [orders, setOrders] = useState<Row[]>([])
  const [inventory, setInventory] = useState<Row[]>([])
  const [policies, setPolicies] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(0)
  const [diagramModal, setDiagramModal] = useState<DiagramType | null>(null)

  // Granular section-level states & cold start detection
  const [failures, setFailures] = useState<Record<string, string>>({})
  const [isWakingBackend, setIsWakingBackend] = useState(false)
  const [coldStartRetries, setColdStartRetries] = useState(0)

  const loadData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return
    setLoading(true)
    const errMap: Record<string, string> = {}

    const results = await Promise.allSettled([
      api.getCases(),
      api.getCustomers(),
      api.getOrders(),
      api.getInventory(),
      api.getPolicies(),
    ])

    setNow(Date.now())

    if (results[0].status === 'fulfilled') setCases(results[0].value)
    else errMap['Cases'] = results[0].reason instanceof Error ? results[0].reason.message : 'Failed to load cases'

    if (results[1].status === 'fulfilled') setCustomers(results[1].value)
    else errMap['Customers'] = results[1].reason instanceof Error ? results[1].reason.message : 'Failed to load customers'

    if (results[2].status === 'fulfilled') setOrders(results[2].value)
    else errMap['Orders'] = results[2].reason instanceof Error ? results[2].reason.message : 'Failed to load orders'

    if (results[3].status === 'fulfilled') setInventory(results[3].value)
    else errMap['Inventory'] = results[3].reason instanceof Error ? results[3].reason.message : 'Failed to load inventory'

    if (results[4].status === 'fulfilled') setPolicies(results[4].value)
    else errMap['Policies'] = results[4].reason instanceof Error ? results[4].reason.message : 'Failed to load policies'

    setFailures(errMap)
    setLoading(false)

    // Check if failure is due to cold start timeout
    const isCold = Object.values(errMap).some((msg) => msg.includes('timed out') || msg.includes('cold start'))
    if (isCold && coldStartRetries < 3) {
      setIsWakingBackend(true)
      const nextDelay = (coldStartRetries + 1) * 3500
      setTimeout(() => {
        setColdStartRetries((c) => c + 1)
        loadData()
      }, nextDelay)
    } else {
      setIsWakingBackend(false)
    }
  }, [isLoaded, isSignedIn, coldStartRetries])

  useEffect(() => {
    loadData()
  }, [isLoaded, isSignedIn])

  const open = cases.filter(c => !DONE.includes(lower(c.status)))
  const resolved = cases.filter(c => DONE.includes(lower(c.status)))
  const needsAttention = cases.filter(c => ALERT.includes(lower(c.status)))
  const weekAgo = now - 7 * 864e5
  const openedThisWeek = cases.filter(c => parse(c.created_at) >= weekAgo).length
  const lowStock = inventory.filter(i => available(i) <= 5)
  const latest = [...cases].sort((a, b) => parse(b.created_at) - parse(a.created_at)).slice(0, 6)
  const rate = cases.length ? (resolved.length / cases.length) * 100 : 0
  const readiness = [
    { label: 'Inventory & catalog', count: inventory.length, href: '/explorer?tab=inventory' },
    { label: 'Customer records', count: customers.length, href: '/explorer?tab=customers' },
    { label: 'Order history', count: orders.length, href: '/explorer?tab=orders' },
    { label: 'Resolution policies', count: policies.length, href: '/policies' },
  ]
  const configured = readiness.filter(r => r.count > 0).length
  const firstName = user?.firstName || 'there'
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const failureKeys = Object.keys(failures)

  return <NavShell><main className="fl-page fl-dash">
    <header className="fl-page-head fl-rise" style={{ ['--d' as string]: '0.05s' }}>
      <div><h1>Welcome Back, {firstName}!</h1><p>Resolve customer issues with an agent that follows your policies.</p></div>
      <div className="fl-head-actions">
        <Link href="/imports" className="fl-btn sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <IconUpload size={14} /> Import CSV Datasets
        </Link>
        <span className="fl-pill"><IconCalendar />{today}</span>
        <Link href="/cases/new" className="fl-btn primary"><IconPlus />New Case</Link>
      </div>
    </header>

    {isWakingBackend && (
      <div className="fl-banner info fl-rise">
        <IconRefresh />
        <span>
          <b>Connecting to ResolveAI services…</b> The cloud backend is waking up from inactivity. Retrying automatically.
        </span>
      </div>
    )}

    {failureKeys.length > 0 && !isWakingBackend && (
      <div className="fl-banner error fl-rise">
        <IconAlert />
        <span>
          <b>Unable to reach some workspace services:</b> {failureKeys.map(k => `${k} (${failures[k]})`).join(' · ')}
        </span>
        <button className="fl-btn" onClick={() => loadData()}>
          <IconRefresh /> Retry
        </button>
      </div>
    )}

    <section className="fl-stats">
      <StatCard index={0} icon={IconCases} label="Open cases" value={open.length} loading={loading} tone="up" note={'+' + openedThisWeek + ' opened in the last 7 days'} help="Cases not yet resolved, verified or completed" />
      <StatCard index={1} icon={IconTrendUp} label="Resolution rate" value={rate} decimals={1} suffix="%" loading={loading} tone="up" note={resolved.length + ' of ' + cases.length + ' cases resolved'} help="Share of all cases the backend reports as resolved" />
      <StatCard index={2} icon={IconUsers} label="Customers" value={customers.length} loading={loading} tone="up" note={orders.length + ' orders linked'} help="Customer records imported into this workspace" />
      <StatCard index={3} icon={IconAlert} label="Attention flags" value={needsAttention.length} loading={loading} tone={needsAttention.length ? 'down' : 'up'} note={needsAttention.length ? 'Blocked or escalated' : 'Nothing blocked'} help="Cases marked failed, blocked or escalated" />
    </section>

    {/* 3 Operational Hub Banners */}
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', margin: '24px 0' }}>
      <article className="fl-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '155px', position: 'relative', background: '#051124' }}>
          <img src="/assets/banners/card-intake.webp" alt="Investigation Hub" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <small style={{ color: '#27c4f5', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Speech Recognition & Intake</small>
          <strong style={{ fontSize: '15px' }}>Voice Mic & Dispute Intake</strong>
          <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', margin: 0, lineHeight: 1.4 }}>
            Record customer conflict audio via microphone or upload batch dispute CSV files.
          </p>
          <Link href="/cases/new" className="fl-btn primary sm" style={{ marginTop: 'auto', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IconMic size={14} /> Record via Mic
          </Link>
        </div>
      </article>

      <article className="fl-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '155px', position: 'relative', background: '#0c2749' }}>
          <img src="/assets/banners/card-routing.webp" alt="Multi-Hub Logistics" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            type="button"
            className="fl-card-zoom-trigger"
            onClick={() => setDiagramModal('stock-allocation')}
            title="Expand stock allocation architecture diagram"
          >
            Expand Diagram ⛶
          </button>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <small style={{ color: '#fbbf24', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Policy & Multi-Hub</small>
          <strong style={{ fontSize: '15px' }}>Regional Stock Routing</strong>
          <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', margin: 0, lineHeight: 1.4 }}>
            Mumbai is out of stock (0 units); Pune (2 units) allocated automatically without fake promises.
          </p>
          <Link href="/inventory" className="fl-btn sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
            Check Inventory ↗
          </Link>
        </div>
      </article>

      <article className="fl-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '155px', position: 'relative', background: '#06122b' }}>
          <img src="/assets/banners/card-execution.webp" alt="Settlement Engine" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            type="button"
            className="fl-card-zoom-trigger"
            onClick={() => setDiagramModal('execution-trace')}
            title="Expand closed-loop execution trace diagram"
          >
            Expand Diagram ⛶
          </button>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <small style={{ color: '#a78bfa', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Closed-Loop Settlements</small>
          <strong style={{ fontSize: '15px' }}>Verified Action Execution</strong>
          <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', margin: 0, lineHeight: 1.4 }}>
            Immutable event logs, replacement dispatches, and email updates with zero hallucination.
          </p>
          <Link href="/agent-runs" className="fl-btn sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
            Audit Runs ↗
          </Link>
        </div>
      </article>
    </section>

    <section className="fl-card fl-table-card fl-rise" style={{ ['--d' as string]: '0.5s' }}>
      <div className="fl-card-head"><h2>Recent cases</h2><Link href="/cases" className="fl-link">View All</Link></div>
      {!loading && latest.length === 0 ? <div className="fl-empty">
        <span className="fl-empty-icon"><IconCases /></span><h3>No cases yet</h3>
        <p>Open a case or record via voice mic to give ResolveAI an issue to investigate.</p>
        <Link href="/cases/new" className="fl-btn primary"><IconPlus />New Case</Link>
      </div> : <div className="fl-table-wrap"><table className="fl-table">
        <thead><tr><th>Case</th><th>Customer</th><th>Order</th><th>Issue</th><th>Opened</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{loading ? [0, 1, 2, 3].map(i => <tr key={i} className="fl-skel-row"><td colSpan={7}><span className="fl-skel" style={{ width: (88 - i * 9) + '%' }} /></td></tr>) :
          latest.map((c, i) => <tr key={c.id} className="fl-row-in" style={{ ['--d' as string]: 0.62 + i * 0.05 + 's' }}>
            <td><span className="fl-name-cell"><span className={'fl-square tone-' + toneFor(c.customer_name || c.customer_id)}>{(c.customer_name || c.customer_id || 'C').slice(0, 1)}</span><Link href={'/cases/' + c.id}>{c.id}</Link></span></td>
            <td>{c.customer_name || c.customer_id}</td>
            <td className="fl-muted">{c.order_id}</td>
            <td><span className="fl-truncate">{c.customer_message || 'No issue summary'}</span></td>
            <td><span className="fl-time"><IconClock />{ago(c.created_at, now)}</span></td>
            <td><span className={'fl-status ' + statusKind(c.status)}>{nice(c.status)}</span></td>
            <td><span className="fl-row-actions"><Link href={'/cases/' + c.id}>View</Link><Link href="/agent-runs">Trace</Link></span></td>
          </tr>)}
        </tbody></table></div>}
      <div className="fl-hatch" aria-hidden="true" />
    </section>

    <section className="fl-dash-lower">
      <article className="fl-card fl-rise" style={{ ['--d' as string]: '0.66s' }}>
        <div className="fl-card-head"><h2>Workspace readiness</h2><span className="fl-count">{loading ? '—' : configured}<small>/4</small></span></div>
        <div className="fl-meter"><span style={{ width: (loading ? 0 : configured / 4 * 100) + '%' }} /></div>
        <ul className="fl-list">{readiness.map(r => <li key={r.label}><Link href={r.href}>
          <span className={'fl-check' + (r.count > 0 ? ' ok' : '')} />{r.label}<b>{loading ? '—' : r.count}</b></Link></li>)}</ul>
      </article>
      <article className="fl-card fl-rise" style={{ ['--d' as string]: '0.72s' }}>
        <div className="fl-card-head"><h2>Needs attention</h2><Link href="/cases" className="fl-link">Review</Link></div>
        {needsAttention.length ? <ul className="fl-list">{needsAttention.slice(0, 4).map(c => <li key={c.id}><Link href={'/cases/' + c.id}>
          <span className="fl-square tone-red sm"><IconAlert /></span><span className="fl-list-main">{c.id}<small>{c.customer_message}</small></span><span className="fl-status alert">{nice(c.status)}</span></Link></li>)}</ul>
          : <p className="fl-quiet">{loading ? 'Checking case status…' : 'No failed, blocked or escalated cases right now.'}</p>}
      </article>
      <article className="fl-card fl-rise" style={{ ['--d' as string]: '0.78s' }}>
        <div className="fl-card-head"><h2>Inventory watch</h2><Link href="/explorer?tab=inventory" className="fl-link">Inspect</Link></div>
        {lowStock.length ? <ul className="fl-list">{lowStock.slice(0, 4).map((i, k) => <li key={String(i.id || i.product_id || k)}><div>
          <span className="fl-square tone-amber sm"><IconBox /></span><span className="fl-list-main">{String(i.product_name || i.sku || i.product_id || 'Inventory item')}<small>{String(i.warehouse || '—')}</small></span><b className={available(i) <= 0 ? 'neg' : 'warn'}>{available(i)} left</b></div></li>)}</ul>
          : <p className="fl-quiet">{loading ? 'Checking stock…' : 'No items at five units or fewer.'}</p>}
      </article>
    </section>
    <p className="fl-foot-note"><IconShield />Counts come from your connected ResolveAI API. Nothing on this page is simulated.</p>

    {/* Click-to-Expand Feature Diagram Modal */}
    <DiagramModal type={diagramModal} onClose={() => setDiagramModal(null)} />
  </main></NavShell>
}
