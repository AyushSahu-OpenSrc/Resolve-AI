'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'

type Case = {
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

const PlayIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase().replace(/_/g, '-')
  return (
    <span className={`status-pill ${s}`}>
      {status.toUpperCase().replace(/_/g, ' ')}
    </span>
  )
}

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z')).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function CasesPage() {
  const router = useRouter()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)

  useEffect(() => {
    api.getCases()
      .then(setCases)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleRunDemo = async () => {
    setDemoLoading(true)
    try {
      await api.runDemo()
      router.push('/cases/CASE-DEMO-001')
    } catch {
      alert('Demo failed — is backend running?')
      setDemoLoading(false)
    }
  }

  const sorted = [...cases].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <NavShell>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="text-title">Cases</h1>
            <p className="text-caption" style={{ marginTop: '0.1875rem' }}>
              {loading ? 'Loading...' : `${cases.length} case${cases.length !== 1 ? 's' : ''} total`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              id="btn-run-demo"
              className="btn btn-ghost"
              onClick={handleRunDemo}
              disabled={demoLoading}
              style={{ fontSize: '0.8125rem', border: '1px solid var(--line)' }}
            >
              <PlayIcon />
              {demoLoading ? 'Starting...' : 'Run Guided Scenario'}
            </button>
            <Link id="btn-new-case" href="/cases/new" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
              <PlusIcon />
              New Case
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem 1.75rem' }}>
        {loading && (
          <div className="empty-state">Loading cases...</div>
        )}
        {error && (
          <div className="empty-state" style={{ color: 'var(--error)' }}>
            Failed to load: {error}. Is the backend running?
          </div>
        )}
        {!loading && !error && cases.length === 0 && (
          <div className="empty-state">
            No cases yet —{' '}
            <Link href="/cases/new" style={{ color: 'var(--signal)', textDecoration: 'none' }}>
              create one
            </Link>{' '}
            to see the agent run.
          </div>
        )}
        {!loading && !error && cases.length > 0 && (
          <div className="panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 160 }}>Case ID</th>
                  <th>Customer</th>
                  <th style={{ width: 120 }}>Order</th>
                  <th>Issue</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 100 }}>Created</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(c => (
                  <tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{c.id}</span>
                        {c.id === 'CASE-DEMO-001' && (
                          <span style={{
                            fontSize: '0.5625rem',
                            fontFamily: 'IBM Plex Mono, monospace',
                            color: 'var(--signal)',
                            border: '1px solid rgba(193,99,30,0.3)',
                            padding: '0.0625rem 0.3125rem',
                            borderRadius: 2,
                            letterSpacing: '0.04em',
                          }}>
                            DEMO
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--ink)' }}>
                        {c.customer_name || c.customer_id}
                      </div>
                      <div style={{ fontSize: '0.625rem', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-faint)', marginTop: 1 }}>
                        {c.customer_id}
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{c.order_id}</span>
                    </td>
                    <td style={{ maxWidth: 240 }}>
                      <span className="truncate-2" style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', display: 'block' }}>
                        {c.customer_message}
                      </span>
                    </td>
                    <td>
                      <StatusPill status={c.status} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-faint)' }}>
                        {timeAgo(c.created_at)}
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/cases/${c.id}`}
                        style={{ fontSize: '0.8125rem', color: 'var(--signal)', textDecoration: 'none', fontWeight: 500 }}
                        onClick={e => e.stopPropagation()}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </NavShell>
  )
}
