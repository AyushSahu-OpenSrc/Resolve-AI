'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAgentRun } from '@/hooks/useAgentRun'
import { api } from '@/lib/api'

function formatTime(ts: string) {
  try {
    const d = new Date(ts + (ts.includes('Z') || ts.includes('+') ? '' : 'Z'))
    return d.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return ts.slice(11, 19) }
}

function getStatusDarkBg(s: string) {
  const map: Record<string, string> = {
    resolved: 'rgba(47,125,92,0.15)', verified: 'rgba(47,125,92,0.15)',
    running: 'rgba(193,99,30,0.15)', open: 'rgba(62,92,118,0.15)',
    blocked: 'rgba(166,58,46,0.15)', failed: 'rgba(166,58,46,0.15)',
    replanning: 'rgba(184,134,11,0.15)', escalated: 'rgba(62,92,118,0.15)',
    completed: 'rgba(47,125,92,0.15)',
  }
  return map[s] || 'rgba(255,255,255,0.05)'
}

function getStatusDarkColor(s: string) {
  const map: Record<string, string> = {
    resolved: '#4aba8a', verified: '#4aba8a', completed: '#4aba8a',
    running: '#d4834a', open: '#6b8fa8',
    blocked: '#c96b60', failed: '#c96b60',
    replanning: '#d4ad4a', escalated: '#6b8fa8',
  }
  return map[s] || '#ededea'
}

function StatusPill({ status, dark = false }: { status: string; dark?: boolean }) {
  const s = status.toLowerCase()
  return (
    <span
      className={`status-pill ${s}`}
      style={dark ? {
        background: getStatusDarkBg(s),
        color: getStatusDarkColor(s),
      } : undefined}
    >
      {status.toUpperCase()}
    </span>
  )
}

// SVG icons
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const RefreshCw = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
)

const Zap = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const ChevronDown = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 120ms' }}
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const CheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

// One event row with expandable tool call JSON
function EventRow({ event, index }: { event: any; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = event.input_data || event.output_data
  const statusClass = event.status?.toUpperCase?.() || event.status

  return (
    <>
      <div
        className={`event-row status-${event.status}`}
        style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)' }}
        onClick={() => hasDetails && setExpanded(e => !e)}
      >
        <span className="event-ts">{formatTime(event.timestamp)}</span>
        <span className={`event-status-word ${statusClass}`}>
          {statusClass}
        </span>
        <div style={{ minWidth: 0 }}>
          {event.tool_name && (
            <span className="event-tool-name">{event.tool_name}</span>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span className="event-summary">{event.reasoning_summary}</span>
            {hasDetails && (
              <span style={{ flexShrink: 0, color: 'var(--dark-ink-faint)', marginTop: 3 }}>
                <ChevronDown expanded={expanded} />
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="event-details-panel">
          <div className="event-details-grid">
            {event.input_data && (
              <div className="event-details-block">
                <div className="event-details-block-label">Input</div>
                <pre>{JSON.stringify(event.input_data, null, 2)}</pre>
              </div>
            )}
            {event.output_data && (
              <div className="event-details-block">
                <div className="event-details-block-label">Output</div>
                <pre>{JSON.stringify(event.output_data, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = use(params)
  const { events, caseDetail, isRunning, startPolling, refetch } = useAgentRun(caseId)
  const logEndRef = useRef<HTMLDivElement>(null)
  const [prevInventory, setPrevInventory] = useState<Record<string, number>>({})
  const [changedWarehouses, setChangedWarehouses] = useState<Set<string>>(new Set())
  const [isResolved, setIsResolved] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resolveLoading, setResolveLoading] = useState(false)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  useEffect(() => {
    if (!caseDetail?.inventory) return
    const newChanges = new Set<string>()
    const newPrev: Record<string, number> = {}
    for (const inv of caseDetail.inventory) {
      const prev = prevInventory[inv.warehouse]
      if (prev !== undefined && prev !== inv.quantity) {
        newChanges.add(inv.warehouse)
      }
      newPrev[inv.warehouse] = inv.quantity
    }
    if (newChanges.size > 0) {
      setChangedWarehouses(newChanges)
      setTimeout(() => setChangedWarehouses(new Set()), 800)
    }
    setPrevInventory(newPrev)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseDetail?.inventory])

  useEffect(() => {
    if (caseDetail?.status === 'resolved' && !isResolved) {
      setIsResolved(true)
    }
  }, [caseDetail?.status, isResolved])

  const handleReset = async () => {
    if (caseId !== 'CASE-DEMO-001') return
    setResetLoading(true)
    try {
      await api.resetDemo()
      await refetch()
    } finally {
      setResetLoading(false)
    }
  }

  const handleRerun = async () => {
    if (caseId !== 'CASE-DEMO-001') return
    setIsResolved(false)
    setResetLoading(true)
    try {
      await api.runDemo()
      startPolling()
    } finally {
      setResetLoading(false)
    }
  }

  const handleResolve = async () => {
    if (isRunning) return
    setResolveLoading(true)
    try {
      await api.resolveCase(caseId)
      startPolling()
    } catch (e: any) {
      alert(e.message || 'Failed to start resolution')
    } finally {
      setResolveLoading(false)
    }
  }

  const caseStatus = caseDetail?.status || 'loading'
  const isDemo = caseId === 'CASE-DEMO-001'
  const canResolve = caseDetail && !isRunning && caseDetail.status === 'open'

  return (
    <div className="exec-screen" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{
        padding: '0.625rem 1.25rem',
        borderBottom: '1px solid var(--dark-line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--dark-surface-raised)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link
            href="/cases"
            style={{ color: 'var(--dark-ink-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', transition: 'color 80ms' }}
          >
            <ChevronLeft />
            Cases
          </Link>
          <div style={{ width: 1, height: 14, background: 'var(--dark-line)' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8125rem', color: 'var(--dark-ink-muted)' }}>
            {caseId}
          </span>
          <StatusPill status={caseStatus} dark />
          {isDemo && (
            <span style={{
              fontSize: '0.5625rem', fontFamily: 'IBM Plex Mono, monospace',
              color: 'var(--dark-ink-faint)',
              border: '1px solid var(--dark-line)',
              padding: '0.125rem 0.375rem',
              borderRadius: 3,
              letterSpacing: '0.05em',
            }}>
              DEMO
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isRunning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--dark-ink-muted)', fontSize: '0.75rem', marginRight: '0.25rem' }}>
              <div style={{
                display: 'flex', gap: 3, alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="typing-dot" style={{
                    animation: `dot-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
                  }} />
                ))}
              </div>
              Agent running
            </div>
          )}

          {/* Resolve button for non-demo, non-running open cases */}
          {!isDemo && canResolve && (
            <button
              id="btn-run-resolveai"
              className="btn"
              onClick={handleResolve}
              disabled={resolveLoading}
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', background: 'var(--signal)', color: '#fff', border: 'none', gap: '0.375rem' }}
            >
              <Zap />
              Run ResolveAI
            </button>
          )}

          {isDemo && (
            <>
              <button
                id="btn-reset-demo"
                className="btn"
                onClick={handleReset}
                disabled={resetLoading}
                style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', background: 'transparent', color: 'var(--dark-ink-muted)', border: '1px solid var(--dark-line)', gap: '0.375rem' }}
              >
                <RefreshCw />
                Reset
              </button>
              <button
                id="btn-rerun-demo"
                className="btn"
                onClick={handleRerun}
                disabled={resetLoading || isRunning}
                style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', background: 'var(--signal)', color: '#fff', border: 'none', gap: '0.375rem' }}
              >
                <Zap />
                Re-run Demo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Three-pane layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Left pane — Case Facts */}
        <div style={{
          width: 268, flexShrink: 0,
          borderRight: '1px solid var(--dark-line)',
          overflowY: 'auto',
          background: 'var(--dark-surface)',
        }}>
          <div style={{
            padding: '0.625rem 1rem',
            borderBottom: '1px solid var(--dark-line)',
            fontSize: '0.6875rem', fontWeight: 600,
            color: 'var(--dark-ink-muted)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Case Facts
          </div>

          {caseDetail ? (
            <div style={{ padding: '0.875rem 1rem' }}>

              {/* Goal */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.5625rem', fontWeight: 500, color: 'var(--dark-ink-faint)', marginBottom: '0.375rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Goal
                </div>
                <div style={{
                  fontSize: '0.8125rem', color: 'var(--dark-ink)', lineHeight: 1.55,
                  borderLeft: '2px solid var(--dark-line)',
                  paddingLeft: '0.5rem',
                  fontStyle: 'italic',
                }}>
                  "{caseDetail.customer_message}"
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />

              {/* Customer */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.5625rem', fontWeight: 500, color: 'var(--dark-ink-faint)', marginBottom: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Customer
                </div>
                <KVRow label="ID" value={caseDetail.customer?.id || caseDetail.customer_id} />
                <KVRow label="Name" value={caseDetail.customer?.name} mono={false} />
                <KVRow label="Tier" value={
                  <span style={{
                    color: caseDetail.customer?.tier === 'premium' ? '#d4834a' : 'var(--dark-ink)',
                    fontWeight: caseDetail.customer?.tier === 'premium' ? 600 : 400,
                  }}>
                    {caseDetail.customer?.tier?.toUpperCase()}
                  </span>
                } />
                <KVRow label="Email" value={caseDetail.customer?.email} mono={false} />
              </div>

              <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />

              {/* Order */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.5625rem', fontWeight: 500, color: 'var(--dark-ink-faint)', marginBottom: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Order
                </div>
                <KVRow label="ID" value={caseDetail.order?.id} />
                <KVRow label="Status" value={caseDetail.order?.status?.toUpperCase()} />
                <KVRow label="Delivered" value={
                  caseDetail.order?.delivery_date
                    ? new Date(caseDetail.order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'N/A'
                } />
                <KVRow label="Issue" value={caseDetail.order?.issue_type} />
                <KVRow label="Amount" value={`₹${caseDetail.order?.total_amount?.toLocaleString()}`} />
              </div>

              {caseDetail.product && (
                <>
                  <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.5625rem', fontWeight: 500, color: 'var(--dark-ink-faint)', marginBottom: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Product
                    </div>
                    <KVRow label="Name" value={caseDetail.product.name} mono={false} />
                    <KVRow label="SKU" value={caseDetail.product.sku} />
                  </div>
                </>
              )}

              {caseDetail.replacement && (
                <>
                  <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />
                  <div className={isResolved ? 'resolved-transition' : ''} style={{
                    borderRadius: 4, padding: '0.75rem',
                    background: 'rgba(47,125,92,0.08)',
                    border: '1px solid rgba(47,125,92,0.25)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4aba8a' }}>
                      <CheckCircle />
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em' }}>RESOLVED</span>
                    </div>
                    <KVRow label="RPL" value={caseDetail.replacement.id} />
                    <KVRow label="From" value={caseDetail.replacement.warehouse} />
                    <KVRow label="Track" value={caseDetail.replacement.tracking_number} />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: '1rem', color: 'var(--dark-ink-muted)', fontSize: '0.8125rem' }}>Loading case...</div>
          )}
        </div>

        {/* Center pane — Operations Log */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--dark-line)' }}>
          <div style={{
            padding: '0.625rem 1rem',
            borderBottom: '1px solid var(--dark-line)',
            fontSize: '0.6875rem', fontWeight: 600, color: 'var(--dark-ink-muted)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--dark-surface-raised)', flexShrink: 0,
          }}>
            <span>Operations Log</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 400, fontSize: '0.625rem' }}>{events.length} events</span>
              {events.length > 0 && (
                <span style={{ fontSize: '0.5625rem', color: 'var(--dark-ink-faint)' }}>
                  Click a row to inspect tool I/O
                </span>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'IBM Plex Mono, monospace' }}>
            {events.length === 0 && !isRunning && (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--dark-ink-muted)', fontSize: '0.8125rem' }}>
                {caseStatus === 'open'
                  ? 'Agent has not started. Use the Re-run Demo or Run ResolveAI button.'
                  : 'No events recorded.'}
              </div>
            )}

            {events.map((event, i) => (
              <EventRow key={event.id} event={event} index={i} />
            ))}

            {isRunning && (
              <div style={{
                padding: '0.75rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                color: 'var(--dark-ink-muted)', fontSize: '0.8125rem',
              }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="typing-dot" style={{
                      animation: `dot-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
                    }} />
                  ))}
                </div>
                Agent is reasoning...
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Right pane — Live State */}
        <div style={{ width: 268, flexShrink: 0, overflowY: 'auto', background: 'var(--dark-surface)' }}>
          <div style={{
            padding: '0.625rem 1rem',
            borderBottom: '1px solid var(--dark-line)',
            fontSize: '0.6875rem', fontWeight: 600,
            color: 'var(--dark-ink-muted)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Live State
          </div>

          <div style={{ padding: '0.875rem 1rem' }}>

            {/* Case status */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.5625rem', color: 'var(--dark-ink-faint)', fontWeight: 500, marginBottom: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Case
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--dark-ink-muted)' }}>Status</span>
                <span className={`live-value ${caseStatus}`} style={{ color: getStatusDarkColor(caseStatus) }}>
                  {caseStatus.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />

            {/* Order status */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.5625rem', color: 'var(--dark-ink-faint)', fontWeight: 500, marginBottom: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Order
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--dark-ink-muted)' }}>Status</span>
                <span className="live-value" style={{ color: 'var(--dark-ink)' }}>
                  {caseDetail?.order?.status?.toUpperCase() || '—'}
                </span>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />

            {/* Inventory */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.5625rem', color: 'var(--dark-ink-faint)', fontWeight: 500, marginBottom: '0.625rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Inventory — PROD-HP01
              </div>
              {caseDetail?.inventory?.map(inv => (
                <div key={inv.warehouse} style={{ marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.125rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--dark-ink-muted)' }}>{inv.warehouse}</span>
                    <span
                      className={`live-value${changedWarehouses.has(inv.warehouse) ? ' changed' : ''}`}
                      style={{
                        color: inv.available === 0 ? 'var(--error)' : inv.available === 1 ? '#d4834a' : '#4aba8a',
                        fontWeight: 600,
                        transition: 'color 100ms',
                      }}
                    >
                      {inv.available} avail
                    </span>
                  </div>
                  {/* Mini bar */}
                  <div style={{ height: 2, background: 'var(--dark-line)', borderRadius: 1 }}>
                    <div style={{
                      height: '100%', borderRadius: 1,
                      background: inv.available === 0 ? 'var(--error)' : inv.available === 1 ? '#d4834a' : '#4aba8a',
                      width: `${Math.min(100, (inv.available / 3) * 100)}%`,
                      transition: 'width 400ms ease',
                    }} />
                  </div>
                  <div style={{ marginTop: '0.125rem', fontSize: '0.5625rem', color: 'var(--dark-ink-faint)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    qty={inv.quantity} res={inv.reserved_quantity}
                  </div>
                </div>
              ))}
              {(!caseDetail?.inventory || caseDetail.inventory.length === 0) && (
                <div style={{ color: 'var(--dark-ink-muted)', fontSize: '0.8125rem' }}>—</div>
              )}
            </div>

            {caseDetail?.replacement && (
              <>
                <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />
                <div>
                  <div style={{ fontSize: '0.5625rem', color: 'var(--dark-ink-faint)', fontWeight: 500, marginBottom: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Replacement
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--dark-ink-muted)' }}>From</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8125rem', color: '#4aba8a', fontWeight: 600 }}>
                      {caseDetail.replacement.warehouse}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.5625rem', color: 'var(--dark-ink-faint)', fontFamily: 'IBM Plex Mono, monospace', marginTop: '0.125rem', wordBreak: 'break-all' }}>
                    {caseDetail.replacement.tracking_number}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KVRow({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: '0.5rem',
      padding: '0.3125rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: '0.625rem', color: 'var(--dark-ink-faint)', flexShrink: 0, width: 48, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </span>
      <span style={{
        fontSize: '0.8125rem', color: 'var(--dark-ink)',
        fontFamily: mono ? 'IBM Plex Mono, monospace' : undefined,
        wordBreak: 'break-all',
      }}>
        {value || '—'}
      </span>
    </div>
  )
}
