'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAgentRun } from '@/hooks/useAgentRun'
import { api } from '@/lib/api'

function formatTime(ts: string) {
  try {
    const d = new Date(ts + (ts.includes('Z') || ts.includes('+') ? '' : 'Z'))
    return d.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return ts.slice(11, 19) }
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

// SVG icons
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const RefreshCw = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
)

const Zap = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const Shield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const CheckCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: caseId } = use(params)
  const { events, caseDetail, isRunning, startPolling, refetch } = useAgentRun(caseId)
  const logEndRef = useRef<HTMLDivElement>(null)
  const [prevInventory, setPrevInventory] = useState<Record<string, number>>({})
  const [changedWarehouses, setChangedWarehouses] = useState<Set<string>>(new Set())
  const [isResolved, setIsResolved] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // Auto-scroll log to bottom on new events
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  // Detect inventory changes for flash animation
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
      setTimeout(() => setChangedWarehouses(new Set()), 700)
    }
    setPrevInventory(newPrev)
  }, [caseDetail?.inventory])

  // Detect resolution for animation
  useEffect(() => {
    if (caseDetail?.status === 'resolved' && !isResolved) {
      setIsResolved(true)
    }
  }, [caseDetail?.status])

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

  const caseStatus = caseDetail?.status || 'loading'
  const isDemo = caseId === 'CASE-DEMO-001'

  return (
    <div className="exec-screen" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid var(--dark-line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--dark-surface-raised)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/cases"
            style={{ color: 'var(--dark-ink-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}
          >
            <ChevronLeft />
            Cases
          </Link>
          <div style={{ width: 1, height: 16, background: 'var(--dark-line)' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8125rem', color: 'var(--dark-ink-muted)' }}>
            {caseId}
          </span>
          <StatusPill status={caseStatus} dark />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isRunning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--dark-ink-muted)', fontSize: '0.75rem' }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--signal)',
                animation: 'pulse-signal 1.5s ease-in-out infinite',
              }} />
              Agent running
            </div>
          )}
          {isDemo && (
            <>
              <button
                className="btn"
                onClick={handleReset}
                disabled={resetLoading}
                style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', background: 'transparent', color: 'var(--dark-ink-muted)', border: '1px solid var(--dark-line)', gap: '0.375rem' }}
              >
                <RefreshCw />
                Reset
              </button>
              <button
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

        {/* Left pane — Case Facts (~280px) */}
        <div style={{
          width: 280, flexShrink: 0,
          borderRight: '1px solid var(--dark-line)',
          overflowY: 'auto',
          background: 'var(--dark-surface)',
        }}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--dark-line)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--dark-ink-muted)', letterSpacing: '0.04em' }}>
            CASE FACTS
          </div>

          {caseDetail ? (
            <div style={{ padding: '0.75rem 1rem' }}>
              {/* Goal */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--dark-ink-muted)', marginBottom: '0.375rem', letterSpacing: '0.04em' }}>GOAL</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--dark-ink)', lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{caseDetail.customer_message}"
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />

              {/* Customer */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--dark-ink-muted)', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>CUSTOMER</div>
                <KVRow label="ID" value={caseDetail.customer?.id || caseDetail.customer_id} />
                <KVRow label="Name" value={caseDetail.customer?.name} />
                <KVRow label="Tier" value={
                  <span style={{ color: caseDetail.customer?.tier === 'premium' ? '#d4834a' : 'var(--dark-ink)' }}>
                    {caseDetail.customer?.tier?.toUpperCase()}
                  </span>
                } />
                <KVRow label="Email" value={caseDetail.customer?.email} mono={false} />
              </div>

              <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />

              {/* Order */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--dark-ink-muted)', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>ORDER</div>
                <KVRow label="ID" value={caseDetail.order?.id} />
                <KVRow label="Status" value={caseDetail.order?.status?.toUpperCase()} />
                <KVRow label="Delivered" value={
                  caseDetail.order?.delivery_date
                    ? new Date(caseDetail.order.delivery_date).toLocaleDateString()
                    : 'N/A'
                } />
                <KVRow label="Issue" value={caseDetail.order?.issue_type} />
                <KVRow label="Amount" value={`\u20b9${caseDetail.order?.total_amount?.toLocaleString()}`} />
              </div>

              {caseDetail.product && (
                <>
                  <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--dark-ink-muted)', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>PRODUCT</div>
                    <KVRow label="Name" value={caseDetail.product.name} mono={false} />
                    <KVRow label="SKU" value={caseDetail.product.sku} />
                  </div>
                </>
              )}

              {/* Resolution */}
              {caseDetail.replacement && (
                <>
                  <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />
                  <div className={isResolved ? 'resolved-transition' : ''} style={{ borderRadius: 4, padding: '0.75rem', background: 'rgba(47,125,92,0.1)', border: '1px solid rgba(47,125,92,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4aba8a' }}>
                      <CheckCircle />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>RESOLVED</span>
                    </div>
                    <KVRow label="RPL" value={caseDetail.replacement.id} />
                    <KVRow label="From" value={caseDetail.replacement.warehouse} />
                    <KVRow label="Track" value={caseDetail.replacement.tracking_number} />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: '1rem', color: 'var(--dark-ink-muted)', fontSize: '0.8125rem' }}>
              Loading case...
            </div>
          )}
        </div>

        {/* Center pane — Operations Log (dominant) */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', borderRight: '1px solid var(--dark-line)',
        }}>
          <div style={{
            padding: '0.875rem 1rem', borderBottom: '1px solid var(--dark-line)',
            fontSize: '0.75rem', fontWeight: 600, color: 'var(--dark-ink-muted)',
            letterSpacing: '0.04em', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', background: 'var(--dark-surface-raised)', flexShrink: 0,
          }}>
            <span>OPERATIONS LOG</span>
            <span style={{ fontWeight: 400 }}>{events.length} events</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'IBM Plex Mono, monospace' }}>
            {events.length === 0 && !isRunning && (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--dark-ink-muted)', fontSize: '0.8125rem' }}>
                {caseStatus === 'open'
                  ? 'Agent has not started. Click Run ResolveAI to begin.'
                  : 'No events recorded.'}
              </div>
            )}
            {events.map((event, i) => (
              <div
                key={event.id}
                className={`event-row status-${event.status}`}
                style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
              >
                <span className="event-ts">{formatTime(event.timestamp)}</span>
                <span className={`event-status-word ${event.status}`}>
                  {event.status}
                </span>
                <div>
                  {event.tool_name && (
                    <span style={{ color: 'var(--dark-ink-muted)', fontSize: '0.6875rem', display: 'block', marginBottom: '0.125rem' }}>
                      {event.tool_name}
                    </span>
                  )}
                  <span className="event-summary">{event.reasoning_summary}</span>
                </div>
              </div>
            ))}
            {isRunning && (
              <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dark-ink-muted)', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 4, height: 4, borderRadius: '50%', background: 'var(--signal)',
                      animation: `pulse-signal 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                Agent is reasoning...
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Right pane — Live State (~280px) */}
        <div style={{ width: 280, flexShrink: 0, overflowY: 'auto', background: 'var(--dark-surface)' }}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--dark-line)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--dark-ink-muted)', letterSpacing: '0.04em' }}>
            LIVE STATE
          </div>

          <div style={{ padding: '0.75rem 1rem' }}>
            {/* Case status */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--dark-ink-muted)', fontWeight: 500, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>CASE</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--dark-ink)', marginBottom: '0.375rem' }}>
                <span style={{ color: 'var(--dark-ink-muted)', marginRight: '0.5rem' }}>Status</span>
                <span className={`live-value ${caseStatus}`} style={{ color: getStatusDarkColor(caseStatus) }}>
                  {caseStatus.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />

            {/* Order status */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--dark-ink-muted)', fontWeight: 500, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>ORDER</div>
              <div style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--dark-ink-muted)', marginRight: '0.5rem' }}>Status</span>
                <span className="live-value" style={{ color: 'var(--dark-ink)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {caseDetail?.order?.status?.toUpperCase() || '—'}
                </span>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />

            {/* Inventory */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--dark-ink-muted)', fontWeight: 500, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>INVENTORY</div>
              {caseDetail?.inventory?.map(inv => (
                <div key={inv.warehouse} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--dark-ink-muted)' }}>{inv.warehouse}</span>
                    <span
                      className={`live-value${changedWarehouses.has(inv.warehouse) ? ' changed' : ''}`}
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '0.8125rem',
                        color: inv.available === 0 ? 'var(--error)' : inv.available === 1 ? '#d4834a' : '#4aba8a',
                        transition: 'color 150ms',
                      }}
                    >
                      {inv.available} avail
                    </span>
                  </div>
                  <div style={{ marginTop: '0.125rem', fontSize: '0.6875rem', color: 'var(--dark-ink-muted)' }}>
                    qty={inv.quantity} reserved={inv.reserved_quantity}
                  </div>
                </div>
              ))}
              {(!caseDetail?.inventory || caseDetail.inventory.length === 0) && (
                <div style={{ color: 'var(--dark-ink-muted)', fontSize: '0.8125rem' }}>—</div>
              )}
            </div>

            {/* Replacement */}
            {caseDetail?.replacement && (
              <>
                <div style={{ height: 1, background: 'var(--dark-line)', margin: '0 0 1rem 0' }} />
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--dark-ink-muted)', fontWeight: 500, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>REPLACEMENT</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--dark-ink)', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--dark-ink-muted)', marginRight: '0.5rem' }}>From</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#4aba8a' }}>{caseDetail.replacement.warehouse}</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--dark-ink-muted)', fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace', marginTop: '0.25rem' }}>
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
      padding: '0.3125rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ fontSize: '0.6875rem', color: 'var(--dark-ink-muted)', flexShrink: 0, width: 52, fontWeight: 500 }}>
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
