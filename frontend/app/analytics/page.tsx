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

type StatProps = {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

function Stat({ label, value, sub, accent }: StatProps) {
  return (
    <div style={{
      padding: '1.25rem',
      background: 'var(--surface-raised)',
      border: '1px solid var(--line)',
      borderLeft: accent ? '3px solid var(--signal)' : undefined,
    }}>
      <div style={{
        fontSize: '0.625rem', fontWeight: 500, color: 'var(--ink-muted)',
        marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.625rem', fontWeight: 600, color: 'var(--ink)',
        fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1, marginBottom: sub ? '0.375rem' : 0,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.25rem' }}>{sub}</div>
      )}
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
        <p className="text-caption" style={{ marginTop: '0.1875rem' }}>
          Computed from live database queries — no invented numbers
        </p>
      </div>

      <div style={{ padding: '1.5rem 1.75rem' }}>
        {loading && <div className="empty-state">Loading...</div>}

        {data && (
          <>
            {/* Stat grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1px',
              marginBottom: '2rem',
              background: 'var(--line)',
              border: '1px solid var(--line)',
            }}>
              <Stat label="Total Cases" value={data.total_cases} />
              <Stat
                label="Resolved"
                value={data.resolved}
                sub={`${data.resolution_rate}% resolution rate`}
                accent
              />
              <Stat label="Running" value={data.running} sub="currently active" />
              <Stat label="Open" value={data.open} sub="awaiting agent" />
              <Stat label="Escalated" value={data.escalated} />
              <Stat
                label="Avg Agent Turns"
                value={data.avg_agent_turns}
                sub="per execution"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

              {/* Resolution breakdown */}
              <div className="panel">
                <div className="panel-header">Resolution breakdown</div>
                <div className="panel-body">
                  {[
                    { label: 'Resolved',  value: data.resolved,  color: 'var(--success)', bg: 'var(--success-tint)' },
                    { label: 'Escalated', value: data.escalated, color: 'var(--info)',    bg: 'var(--info-tint)' },
                    { label: 'Running',   value: data.running,   color: 'var(--signal)',  bg: 'var(--signal-tint)' },
                    { label: 'Open',      value: data.open,      color: 'var(--warning)', bg: 'var(--warning-tint)' },
                  ].map(item => {
                    const pct = data.total_cases > 0 ? (item.value / data.total_cases) * 100 : 0
                    return (
                      <div key={item.label} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--ink)', fontWeight: 500 }}>{item.label}</span>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-muted)' }}>
                            {item.value} / {data.total_cases} &nbsp;({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            background: item.color,
                            width: `${pct}%`,
                            transition: 'width 600ms cubic-bezier(0.2,0,0,1)',
                            borderRadius: 2,
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Execution summary */}
              <div className="panel">
                <div className="panel-header">Execution summary</div>
                <div className="panel-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {[
                      { label: 'Total executions', value: `${data.total_executions}` },
                      { label: 'Avg turns / execution', value: `${data.avg_agent_turns}` },
                      { label: 'Resolution rate', value: `${data.resolution_rate}%` },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>{row.label}</span>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {data.total_executions === 0 && (
                    <div style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>
                      Run the demo or create a case to see execution data.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </NavShell>
  )
}
