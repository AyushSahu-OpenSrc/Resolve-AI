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

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase()
  return (
    <span className={`status-pill ${s}`}>
      {status.toUpperCase()}
    </span>
  )
}

export default function CasesPage() {
  const router = useRouter()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getCases()
      .then(setCases)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleRunDemo = async () => {
    try {
      await api.runDemo()
      router.push('/cases/CASE-DEMO-001')
    } catch (e) {
      alert('Demo failed — is backend running?')
    }
  }

  return (
    <NavShell>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="text-title">Cases</h1>
            <p className="text-caption" style={{ marginTop: '0.25rem' }}>
              All customer resolution cases
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/cases/new" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
              New Case
            </Link>
            <button className="btn btn-secondary" onClick={handleRunDemo} style={{ fontSize: '0.8125rem', border: '1px solid var(--line)', background: 'transparent' }}>
              Run Guided Scenario (Demo)
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>
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
            No cases yet — <Link href="/cases/new" style={{ color: 'var(--signal)', textDecoration: 'none' }}>create one</Link> to see the agent run.
          </div>
        )}
        {!loading && !error && cases.length > 0 && (
          <div className="panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Customer</th>
                  <th>Order</th>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(c => (
                  <tr 
                    key={c.id} 
                    style={{ cursor: 'pointer', transition: 'background-color 0.2s ease' }} 
                    onClick={() => router.push(`/cases/${c.id}`)}
                    className="hover:bg-[var(--surface-hover)]"
                  >
                    <td className="mono" style={{ color: 'var(--ink-muted)' }}>
                      {c.id}
                      {c.id === 'CASE-DEMO-001' && (
                        <span className="status-pill open" style={{ marginLeft: '0.5rem', fontSize: '0.6rem', padding: '0.125rem 0.375rem' }}>DEMO</span>
                      )}
                    </td>
                    <td>{c.customer_name || c.customer_id}</td>
                    <td className="mono" style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>{c.order_id}</td>
                    <td style={{ maxWidth: 240 }}>
                      <span className="truncate-2" style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>
                        {c.customer_message}
                      </span>
                    </td>
                    <td><StatusPill status={c.status} /></td>
                    <td style={{ color: 'var(--ink-muted)', fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                    <td>
                      <Link
                        href={`/cases/${c.id}`}
                        style={{ color: 'var(--signal)', fontSize: '0.8125rem', textDecoration: 'none' }}
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
