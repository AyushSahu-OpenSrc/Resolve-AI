'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'

type SupportCase = {
  id: string
  customer_id: string
  customer_name: string | null
  order_id: string
  customer_message: string
  status: string
  resolution_summary: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

function shortTime(value: string) {
  const date = new Date(value + (value.includes('Z') ? '' : 'Z'))
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function Status({ value }: { value: string }) {
  return <span className={`status-pill ${value.toLowerCase().replace(/_/g, '-')}`}>{value.replace(/_/g, ' ').toUpperCase()}</span>
}

const steps = [
  { n: '01', title: 'Observe', detail: 'Retrieve customer, order, inventory and policy evidence.' },
  { n: '02', title: 'Decide', detail: 'Choose a path using the available evidence and policy rules.' },
  { n: '03', title: 'Act', detail: 'Run a permitted operation against the application database.' },
  { n: '04', title: 'Verify', detail: 'Check the resulting state before calling the case resolved.' },
]

export default function HomePage() {
  const [cases, setCases] = useState<SupportCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api.getCases()
      .then(rows => { if (active) setCases(rows) })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load cases') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const stats = useMemo(() => ({
    total: cases.length,
    resolved: cases.filter(c => c.status.toLowerCase() === 'resolved').length,
    active: cases.filter(c => ['running', 'open'].includes(c.status.toLowerCase())).length,
    escalated: cases.filter(c => c.status.toLowerCase() === 'escalated').length,
  }), [cases])

  const recent = [...cases].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

  return (
    <NavShell>
      <div className="overview-page">
        <header className="overview-topbar">
          <div>
            <div className="text-caption">WORKSPACE / OVERVIEW</div>
            <h1 className="text-display" style={{ margin: '0.35rem 0 0' }}>Customer resolution, under control.</h1>
            <p className="text-body" style={{ color: 'var(--ink-muted)', maxWidth: 690, margin: '0.65rem 0 0' }}>
              Investigate a case, act on real application data, and verify the outcome before it is marked resolved.
            </p>
          </div>
          <div className="overview-actions">
            <Link href="/cases" className="btn btn-secondary">View cases</Link>
            <Link href="/cases/new" className="btn btn-primary">＋ Create case</Link>
          </div>
        </header>

        <section className="overview-stats" aria-label="Case statistics">
          {[
            { label: 'Total cases', value: loading ? '—' : stats.total, note: 'Cases in this workspace', tone: 'neutral' },
            { label: 'Resolved', value: loading ? '—' : stats.resolved, note: 'Marked resolved in data', tone: 'good' },
            { label: 'Open or running', value: loading ? '—' : stats.active, note: 'May need attention', tone: 'signal' },
            { label: 'Escalated', value: loading ? '—' : stats.escalated, note: 'Needs human review', tone: 'warning' },
          ].map(item => (
            <div className="overview-stat panel" key={item.label}>
              <div className="stat-topline"><span>{item.label}</span><span className={`stat-mark ${item.tone}`} /></div>
              <div className="stat-number">{item.value}</div>
              <div className="text-caption">{item.note}</div>
            </div>
          ))}
        </section>

        <section className="overview-grid">
          <div className="panel overview-main-panel">
            <div className="overview-panel-head">
              <div>
                <div className="text-eyebrow">Agent operating model</div>
                <h2 className="text-title" style={{ margin: '0.3rem 0 0' }}>A resolution loop with evidence</h2>
              </div>
              <span className="overview-tag">POLICY-DRIVEN</span>
            </div>
            <div className="agent-steps">
              {steps.map((step, index) => (
                <div className="agent-step" key={step.n}>
                  <div className="agent-step-index">{step.n}</div>
                  <div className="agent-step-copy">
                    <h3>{step.title}</h3>
                    <p>{step.detail}</p>
                  </div>
                  {index < steps.length - 1 && <div className="agent-step-connector" aria-hidden="true" />}
                </div>
              ))}
            </div>
            <div className="overview-note">
              <span className="note-dot" />
              A case should only be treated as resolved after the backend confirms the resulting state.
            </div>
          </div>

          <aside className="panel overview-side-panel">
            <div className="overview-panel-head">
              <div>
                <div className="text-eyebrow">Quick actions</div>
                <h2 className="text-title" style={{ margin: '0.3rem 0 0' }}>Continue work</h2>
              </div>
            </div>
            <Link href="/cases/new" className="quick-action">
              <span className="quick-action-icon">＋</span>
              <span><strong>Create a case</strong><small>Give the agent a customer issue to investigate.</small></span>
              <span className="quick-chevron">↗</span>
            </Link>
            <Link href="/cases" className="quick-action">
              <span className="quick-action-icon">≡</span>
              <span><strong>Review case queue</strong><small>Inspect statuses and open an execution record.</small></span>
              <span className="quick-chevron">↗</span>
            </Link>
            <div className="overview-side-foot">
              <span className="live-indicator" />
              <span>{loading ? 'Connecting to case data…' : error ? 'Case data unavailable' : 'Case data loaded from the backend'}</span>
            </div>
          </aside>
        </section>

        <section className="panel overview-recent">
          <div className="overview-panel-head">
            <div>
              <div className="text-eyebrow">Latest records</div>
              <h2 className="text-title" style={{ margin: '0.3rem 0 0' }}>Recent cases</h2>
            </div>
            <Link href="/cases" className="text-link">Open case queue ↗</Link>
          </div>
          {error ? (
            <div className="overview-empty">
              <strong>Could not load live case data.</strong>
              <span>{error}. Check that the backend is running and the API URL is configured.</span>
            </div>
          ) : loading ? (
            <div className="overview-empty">Loading cases from the backend…</div>
          ) : recent.length === 0 ? (
            <div className="overview-empty">
              <strong>No cases yet.</strong>
              <span>Create a case to see the agent investigation and verified result here.</span>
              <Link href="/cases/new" className="btn btn-primary">Create first case</Link>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Case</th><th>Customer</th><th>Issue</th><th>Status</th><th>Created</th><th /></tr></thead>
                <tbody>{recent.map(c => (
                  <tr key={c.id}>
                    <td><Link href={`/cases/${c.id}`} className="mono overview-case-link">{c.id}</Link></td>
                    <td><span className="overview-customer">{c.customer_name || c.customer_id}</span><small className="overview-subline">{c.customer_id}</small></td>
                    <td><span className="overview-issue">{c.customer_message}</span></td>
                    <td><Status value={c.status} /></td>
                    <td className="mono overview-date">{shortTime(c.created_at)}</td>
                    <td><Link href={`/cases/${c.id}`} className="text-link">Inspect</Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
        <footer className="overview-footer"><span>ResolveAI</span><span>Decisions should be explainable. Outcomes should be verified.</span></footer>
      </div>
    </NavShell>
  )
}
