'use client'

import { useEffect, useState } from 'react'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'

type Analytics = {
  total_cases: number
  resolved: number
  escalated: number
  running: number
  open: number
  resolution_rate: number
  avg_agent_turns: number
  total_executions: number
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ padding: '1.25rem', background: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--ink)', fontFamily: 'IBM Plex Mono, monospace' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return (
    <NavShell>
      <div className="page-header">
        <h1 className="text-title">Analytics</h1>
        <p className="text-caption" style={{ marginTop: '0.25rem' }}>Computed from live database queries</p>
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>
        {loading && <div className="empty-state">Loading...</div>}
        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', marginBottom: '2rem', background: 'var(--line)', border: '1px solid var(--line)' }}>
              <Stat label="Total Cases" value={data.total_cases} />
              <Stat label="Resolved" value={data.resolved} sub={`${data.resolution_rate}% rate`} />
              <Stat label="Escalated" value={data.escalated} />
              <Stat label="Running" value={data.running} />
              <Stat label="Open" value={data.open} />
              <Stat label="Avg Agent Turns" value={data.avg_agent_turns} sub="per execution" />
            </div>

            <div className="panel" style={{ maxWidth: 480 }}>
              <div className="panel-header">Resolution breakdown</div>
              <div className="panel-body">
                {[
                  { label: 'Resolved', value: data.resolved, color: 'var(--success)', total: data.total_cases },
                  { label: 'Escalated', value: data.escalated, color: 'var(--info)', total: data.total_cases },
                  { label: 'Running', value: data.running, color: 'var(--signal)', total: data.total_cases },
                  { label: 'Open', value: data.open, color: 'var(--line)', total: data.total_cases },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--ink)' }}>{item.label}</span>
                      <span style={{ fontSize: '0.8125rem', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-muted)' }}>
                        {item.value} / {item.total}
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        background: item.color,
                        width: item.total > 0 ? `${(item.value / item.total) * 100}%` : '0%',
                        transition: 'width 600ms ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </NavShell>
  )
}
