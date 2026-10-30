'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useAgentRun } from '@/hooks/useAgentRun'
import { api, AgentEvent } from '@/lib/api'
import { NavShell } from '@/components/NavShell'
import { IconMail } from '@/components/icons'

function label(s?: string | null) {
  return (s || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function EventCard({ event, index }: { event: AgentEvent; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const title = event.tool_name ? label(event.tool_name) : label(event.event_type)
  const isGood = ['success', 'completed', 'verified'].includes((event.status || '').toLowerCase())

  return (
    <article className={'exec-event ' + (event.status === 'failed' ? 'failed' : '')}>
      <span className="exec-event-icon">
        {event.status === 'failed' ? '!' : isGood ? '✓' : String(index + 1).padStart(2, '0')}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{event.reasoning_summary || 'Agent step executed against database state.'}</p>
        <small>
          {event.timestamp ? new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Timestamp recorded'} · {label(event.status)}
        </small>
        {(event.input_data || event.output_data) && (
          <button className="exec-expand" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Hide operation details' : 'Inspect operation details'} {expanded ? '−' : '+'}
          </button>
        )}
        {expanded && (
          <div className="exec-json">
            {event.input_data && (
              <div>
                <b>Input arguments</b>
                <pre>{JSON.stringify(event.input_data, null, 2)}</pre>
              </div>
            )}
            {event.output_data && (
              <div>
                <b>Tool output</b>
                <pre>{JSON.stringify(event.output_data, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isLoaded, isSignedIn, user } = useUser()
  const setupComplete = (user?.unsafeMetadata as Record<string, unknown> | undefined)?.resolveaiSetupComplete === true
  const { events, caseDetail, isRunning, startPolling, resetState, refetch, error } = useAgentRun(id)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [executingAction, setExecutingAction] = useState<string | null>(null)
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null)

  const demo = id === 'CASE-DEMO-001'

  useEffect(() => {
    if (caseDetail?.status === 'running' || caseDetail?.status === 'processing') {
      startPolling()
    }
  }, [caseDetail?.status, startPolling])

  async function run() {
    setBusy(true)
    setActionError('')
    try {
      if (demo) {
        resetState()
        await api.runDemo()
      } else {
        await api.resolveCase(id)
      }
      startPolling()
    } catch (e) {
      let raw = e instanceof Error ? e.message : 'The agent could not be started. Check backend connection.'
      if (raw.includes('terminal state') || raw.includes('resolved')) {
        setActionError(`This case is already marked as ${caseDetail?.status || 'resolved'}. You can inspect the recorded audit trace below.`)
      } else {
        try {
          const match = raw.match(/\{.*?\}/)
          if (match) {
            const parsed = JSON.parse(match[0])
            if (parsed.detail) raw = parsed.detail
          }
        } catch { }
        setActionError(raw)
      }
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    setBusy(true)
    setActionError('')
    try {
      await api.resetDemo()
      resetState()
      await refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Demo reset failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleOptionAction(actionType: string) {
    setExecutingAction(actionType)
    setActionError('')
    try {
      const res = (await api.executeAction(id, actionType)) as { email_subject?: string; email_body?: string }
      if (actionType === 'email' && res.email_body) {
        setGeneratedEmail({
          subject: res.email_subject || `Resolution Update for Case ${id}`,
          body: res.email_body,
        })
      }
      await refetch()
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Action failed'
      setActionError(errorMsg)
    } finally {
      setExecutingAction(null)
    }
  }

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) router.replace('/sign-in')
    else if (!setupComplete) router.replace('/onboarding')
  }, [isLoaded, isSignedIn, setupComplete, router])

  const inventory = caseDetail?.inventory || []
  const done = ['resolved', 'verified', 'completed'].includes((caseDetail?.status || '').toLowerCase())

  // Parse structured resolution summary
  let cleanSummary = caseDetail?.resolution_summary || ''
  let actionableOptions: Array<{ id: string; title: string; description: string; action_type: string }> = []
  if (cleanSummary && cleanSummary.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleanSummary)
      cleanSummary = parsed.summary || cleanSummary
      actionableOptions = parsed.actionable_options || []
    } catch (e) {
      console.warn('Could not parse JSON resolution summary:', e)
    }
  }

  if (!isLoaded || !isSignedIn || !setupComplete)
    return (
      <main className="fl-auth-loading">
        <span className="fl-logo">
          <span className="fl-logo-mark">R</span>ResolveAI
        </span>
        <p>Checking workspace access…</p>
      </main>
    )

  return (
    <NavShell>
      <div className="exec-screen">
        <div className="ra-exec">
          <Link href="/cases" className="exec-back">
            ← <span>Back to cases</span>
          </Link>
          <div className="exec-header">
            <div>
              <h1>
                Agent resolution <span className="exec-status">{label(caseDetail?.status || 'Loading')}</span>
              </h1>
              <p>Investigate the evidence, follow the policy, and verify the operational outcome for this customer case.</p>
            </div>
            <div className="exec-actions">
              <button className="exec-button" onClick={() => refetch()} disabled={busy}>
                Refresh state
              </button>
              {demo && (
                <button className="exec-button" onClick={reset} disabled={busy}>
                  Reset demo
                </button>
              )}
              <button className="exec-button primary" onClick={run} disabled={busy || isRunning || done}>
                {busy ? 'Starting…' : isRunning ? 'Agent running' : done ? 'Verified resolution ✓' : 'Run ResolveAI'}
              </button>
            </div>
          </div>

          {(actionError || error) && <div className="exec-error">{actionError || error}</div>}

          <div className="exec-grid">
            {/* 1. Case Evidence Panel */}
            <section className="exec-panel">
              <div className="exec-panel-head">
                Case evidence <small>{caseDetail ? 'Loaded from API' : 'Loading…'}</small>
              </div>
              <div className="exec-panel-body">
                <p className="exec-fact-label">Customer grievance</p>
                <p className="exec-goal">{caseDetail?.customer_message || 'Loading customer issue…'}</p>

                <p className="exec-fact-label">Customer profile</p>
                <div className="exec-fact">
                  <span>Name</span>
                  <strong>{caseDetail?.customer?.name || caseDetail?.customer_id || '—'}</strong>
                </div>
                <div className="exec-fact">
                  <span>Tier</span>
                  <strong>{label(caseDetail?.customer?.tier)}</strong>
                </div>
                <div className="exec-fact">
                  <span>Email</span>
                  <strong>{caseDetail?.customer?.email || '—'}</strong>
                </div>

                <div className="exec-fact-group">
                  <p className="exec-fact-label">Linked order</p>
                  <div className="exec-fact">
                    <span>Reference</span>
                    <strong>{caseDetail?.order?.id || caseDetail?.order_id || '—'}</strong>
                  </div>
                  <div className="exec-fact">
                    <span>Status</span>
                    <strong>{label(caseDetail?.order?.status)}</strong>
                  </div>
                  <div className="exec-fact">
                    <span>Issue</span>
                    <strong>{label(caseDetail?.order?.issue_type)}</strong>
                  </div>
                  <div className="exec-fact">
                    <span>Amount</span>
                    <strong>
                      {caseDetail?.order?.total_amount == null
                        ? '—'
                        : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(caseDetail.order.total_amount)}
                    </strong>
                  </div>
                </div>

                {caseDetail?.product && (
                  <div className="exec-fact-group">
                    <p className="exec-fact-label">Product catalog</p>
                    <div className="exec-fact">
                      <span>Product</span>
                      <strong>{caseDetail.product.name}</strong>
                    </div>
                    <div className="exec-fact">
                      <span>SKU</span>
                      <strong>{caseDetail.product.sku}</strong>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Execution Timeline / Trace */}
            <section className="exec-panel">
              <div className="exec-panel-head">
                Agent execution trace <small>{events.length} recorded events</small>
              </div>
              {events.length ? (
                <div className="exec-events">
                  {events.map((event, i) => (
                    <EventCard key={event.id} event={event} index={i} />
                  ))}
                </div>
              ) : (
                <div className="exec-empty">
                  <div className="exec-empty-mark">
                    <span />
                  </div>
                  <h3>{isRunning ? 'Agent is investigating' : 'Ready to investigate'}</h3>
                  <p>
                    {isRunning
                      ? 'The case is being loaded and the execution trace will appear as real backend events are recorded.'
                      : 'Run ResolveAI to let the agent inspect case evidence, evaluate policy, choose tools and verify the resulting state.'}
                  </p>
                  <button className="exec-button primary" onClick={run} disabled={busy || isRunning || done}>
                    {busy ? 'Starting…' : 'Start agent resolution'}
                  </button>
                </div>
              )}
              {isRunning && (
                <div className="exec-running-note">
                  <i /> Execution active · streaming recorded backend events
                </div>
              )}
            </section>

            {/* 3. Live State & Post-Resolution Actions */}
            <section className="exec-panel">
              <div className="exec-panel-head">Live operational state</div>
              <div className="exec-panel-body">
                <p className="exec-fact-label">Case outcome</p>
                <div className="exec-fact">
                  <span>Case status</span>
                  <strong>{label(caseDetail?.status)}</strong>
                </div>
                <div className="exec-fact" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span>Resolution summary</span>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5 }}>
                    {cleanSummary || 'Not yet recorded'}
                  </p>
                </div>

                {/* Post-Resolution Actionable Options */}
                {actionableOptions.length > 0 && (
                  <div className="exec-fact-group">
                    <p className="exec-fact-label" style={{ color: 'var(--info)' }}>
                      ✦ Agent Actionable Options
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {actionableOptions.map((opt: any) => (
                        <div
                          key={opt.id}
                          style={{
                            background: 'var(--panel)',
                            border: '1px solid var(--line)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>{opt.label}</strong>
                            <button
                              className="exec-button primary"
                              style={{ padding: '3px 8px', fontSize: '11px', height: 'auto' }}
                              disabled={executingAction !== null}
                              onClick={() => handleOptionAction(opt.action_type || 'replacement')}
                            >
                              {executingAction === opt.action_type ? 'Executing…' : 'Execute ↗'}
                            </button>
                          </div>
                          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--ink-muted)' }}>{opt.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Email Draft Display */}
                {generatedEmail && (
                  <div className="exec-fact-group" style={{ background: 'var(--panel)', border: '1px solid var(--info)', padding: '12px', borderRadius: '8px' }}>
                    <p className="exec-fact-label" style={{ color: 'var(--info)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IconMail size={13} /> Generated Customer Dispatch
                    </p>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>{generatedEmail.subject}</div>
                    <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', color: 'var(--ink-2)', margin: 0, fontFamily: 'inherit' }}>
                      {generatedEmail.body}
                    </pre>
                  </div>
                )}

                <div className="exec-fact-group">
                  <p className="exec-fact-label">Regional inventory</p>
                  {inventory.length ? (
                    inventory.map((inv, i) => (
                      <div className="exec-inventory" key={inv.warehouse + i}>
                        <span className="exec-stock-icon">◇</span>
                        <div>
                          <strong>{inv.warehouse}</strong>
                          <small>
                            {inv.quantity} on hand · {inv.reserved_quantity} reserved
                          </small>
                        </div>
                        <b className={inv.available <= 1 ? 'low' : ''}>{inv.available} available</b>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#7e8d87', fontSize: 14, lineHeight: 1.6 }}>
                      Inventory state will appear when the case and its product are loaded.
                    </p>
                  )}
                </div>

                {caseDetail?.replacement && (
                  <div className="exec-notice" style={{ background: 'var(--success-tint)', color: 'var(--success)', border: '1px solid var(--success)' }}>
                    ✓ Replacement verified: {caseDetail.replacement.id} · Warehouse: {caseDetail.replacement.warehouse} · Tracking: {caseDetail.replacement.tracking_number}
                  </div>
                )}
                <div className="exec-notice">
                  {done
                    ? 'The backend confirms a completed resolution. All state mutations and verifications were recorded in the database.'
                    : 'Only backend-reported state is displayed here. No mock events are added to the execution log.'}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </NavShell>
  )
}
