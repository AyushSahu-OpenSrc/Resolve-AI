'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'

type CaseRow = {
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

const displayStatus = (s: string) =>
  s
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())

function CaseTag({ value }: { value: string }) {
  const s = value.toLowerCase()
  const kind = ['resolved', 'verified', 'completed'].includes(s)
    ? ''
    : ['running', 'replanning'].includes(s)
    ? 'warning'
    : ['escalated', 'open', 'pending'].includes(s)
    ? 'info'
    : ['failed', 'blocked', 'error'].includes(s)
    ? 'danger'
    : ''
  return <span className={'ra-tag ' + kind}>{displayStatus(value)}</span>
}

export default function CasesPage() {
  const router = useRouter()
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [running, setRunning] = useState<string | null>(null)
  const [toast, setToast] = useState<{ text: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null)

  const load = () => {
    setLoading(true)
    api
      .getCases()
      .then(setCases)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load cases'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(
    () =>
      cases.filter(
        (c) =>
          (filter === 'all' || c.status.toLowerCase() === filter) &&
          [c.id, c.customer_name, c.customer_id, c.order_id, c.customer_message, c.status]
            .join(' ')
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [cases, filter, query]
  )

  const run = async (c: CaseRow) => {
    setRunning(c.id)
    setToast(null)
    const st = c.status.toLowerCase()

    if (['resolved', 'verified', 'completed'].includes(st)) {
      setToast({
        type: 'info',
        text: `Case ${c.id} is already resolved. Opening resolution audit...`,
      })
      setRunning(null)
      setTimeout(() => router.push('/cases/' + c.id), 600)
      return
    }

    try {
      await api.resolveCase(c.id)
      router.push('/cases/' + c.id)
    } catch (e: unknown) {
      let raw = e instanceof Error ? e.message : 'API error'
      if (raw.includes('terminal state') || raw.includes('resolved')) {
        setToast({
          type: 'info',
          text: `Case ${c.id} is already in terminal state (${displayStatus(c.status)}). Opening resolution audit...`,
        })
        setTimeout(() => router.push('/cases/' + c.id), 700)
      } else {
        try {
          const match = raw.match(/\{.*?\}/)
          if (match) {
            const parsed = JSON.parse(match[0])
            if (parsed.detail) raw = parsed.detail
          }
        } catch {}
        setToast({
          type: 'error',
          text: `Notice for ${c.id}: ${raw}`,
        })
      }
      setRunning(null)
    }
  }

  const resolved = cases.filter((c) =>
    ['resolved', 'verified', 'completed'].includes(c.status.toLowerCase())
  ).length
  const open = cases.filter((c) => ['open', 'pending'].includes(c.status.toLowerCase())).length
  const active = cases.filter((c) => ['running', 'replanning'].includes(c.status.toLowerCase())).length

  return (
    <NavShell>
      <div className="ra-page">
        <div className="ra-page-heading">
          <div>
            <div className="ra-eyebrow">Customer operations / Cases</div>
            <h1>Cases</h1>
            <p>Review customer issues, inspect their evidence and run the resolution agent when ready.</p>
          </div>
          <div className="ra-actions">
            <button className="ra-button" onClick={load}>
              Refresh records
            </button>
            <Link href="/cases/new" className="ra-button primary">
              New Case
            </Link>
          </div>
        </div>

        <div className="ra-grid ra-grid-4">
          <div className="ra-card ra-stat">
            <div className="ra-stat-label">Total cases</div>
            <div className="ra-stat-value">{loading ? '—' : cases.length}</div>
            <div className="ra-stat-note">Current backend records</div>
          </div>
          <div className="ra-card ra-stat">
            <div className="ra-stat-label">Pending</div>
            <div className="ra-stat-value">{loading ? '—' : open}</div>
            <div className="ra-stat-note">Open or awaiting resolution</div>
          </div>
          <div className="ra-card ra-stat">
            <div className="ra-stat-label">In progress</div>
            <div className="ra-stat-value">{loading ? '—' : active}</div>
            <div className="ra-stat-note">Agent or replan status</div>
          </div>
          <div className="ra-card ra-stat">
            <div className="ra-stat-label">Resolved</div>
            <div className="ra-stat-value">{loading ? '—' : resolved}</div>
            <div className="ra-stat-note">Status reported by backend</div>
          </div>
        </div>

        {error && (
          <div className="ra-alert" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <section className="ra-card" style={{ marginTop: 16 }}>
          <div className="ra-card-head">
            <div>
              <h2>Customer cases</h2>
              <p>Search, filter and launch a case-specific agent run.</p>
            </div>
            <span className="ra-tag info">Backend records</span>
          </div>
          <div className="ra-toolbar">
            <input
              className="ra-input"
              style={{ maxWidth: 340 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search case, customer, order or issue…"
            />
            <select
              className="ra-select"
              style={{ maxWidth: 190 }}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
            </select>
            <span className="ra-muted" style={{ fontSize: '.68rem', marginLeft: 'auto' }}>
              {filtered.length} of {cases.length} cases
            </span>
          </div>

          {loading ? (
            <div className="ra-empty">Loading case records…</div>
          ) : filtered.length === 0 ? (
            <div className="ra-empty">
              <strong>{cases.length ? 'No cases match these filters' : 'No cases yet'}</strong>
              {cases.length
                ? 'Try a different search or status.'
                : 'Create a case to give the agent a customer issue to investigate.'}
              <div style={{ marginTop: 12 }}>
                <Link className="ra-button primary" href="/cases/new">
                  Create case
                </Link>
              </div>
            </div>
          ) : (
            <div className="ra-table-wrap">
              <table className="ra-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Customer</th>
                    <th>Issue type / message</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={'/cases/' + c.id} className="ra-id">
                          {c.id}
                        </Link>
                      </td>
                      <td>
                        <span className="ra-strong">{c.customer_name || c.customer_id}</span>
                        <div className="ra-muted" style={{ fontSize: '.61rem', marginTop: 3 }}>
                          {c.customer_id}
                        </div>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div className="ra-case-message">{c.customer_message}</div>
                      </td>
                      <td className="ra-id">{c.order_id}</td>
                      <td>
                        <CaseTag value={c.status} />
                      </td>
                      <td>
                        {c.updated_at
                          ? new Date(c.updated_at + (c.updated_at.includes('Z') ? '' : 'Z')).toLocaleDateString(
                              'en-IN',
                              { day: '2-digit', month: 'short' }
                            )
                          : '—'}
                      </td>
                      <td>
                        <div className="ra-actions">
                          <Link href={'/cases/' + c.id} className="ra-button">
                            Inspect
                          </Link>
                          {['resolved', 'verified', 'completed'].includes(c.status.toLowerCase()) ? (
                            <span
                              className="ra-tag"
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '5px 12px',
                                fontSize: '0.72rem',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              ✓ Resolved
                            </span>
                          ) : (
                            <button
                              className="ra-button primary"
                              disabled={running === c.id || ['running', 'replanning'].includes(c.status.toLowerCase())}
                              onClick={() => run(c)}
                            >
                              {running === c.id
                                ? 'Starting…'
                                : ['running', 'replanning'].includes(c.status.toLowerCase())
                                ? 'Running'
                                : 'Run agent'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Floating Polished Toast / Snackbar */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999,
              background:
                toast.type === 'error'
                  ? 'rgba(239, 68, 68, 0.95)'
                  : toast.type === 'info'
                  ? 'rgba(15, 23, 42, 0.95)'
                  : 'rgba(16, 185, 129, 0.95)',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '13.5px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span>{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="ra-page-footer">
          <span>Agent actions call the existing case resolution endpoint.</span>
          <span>Case status is sourced from backend records.</span>
        </div>
      </div>
    </NavShell>
  )
}
