'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'

const Play = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
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

const ArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const stepIcons = {
  goal: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  observe: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  decide: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  act: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  adapt: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
    </svg>
  ),
  verify: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
}

const workflowSteps = [
  { id: 'goal',    label: 'Goal',     icon: stepIcons.goal,    desc: 'Understands the customer objective' },
  { id: 'observe', label: 'Evidence', icon: stepIcons.observe,  desc: 'Queries real data via tool calls' },
  { id: 'decide',  label: 'Decision', icon: stepIcons.decide,   desc: 'Evaluates policy eligibility' },
  { id: 'act',     label: 'Action',   icon: stepIcons.act,      desc: 'Executes state-changing operations' },
  { id: 'adapt',   label: 'Adapt',    icon: stepIcons.adapt,    desc: 'Detects failures, replans instantly' },
  { id: 'verify',  label: 'Verify',   icon: stepIcons.verify,   desc: 'Confirms DB state before closing' },
]

// Mock live log preview shown in hero section
const previewEvents = [
  { ts: '17:42:01', status: 'RUNNING',    tool: 'get_customer',               summary: 'Retrieving customer CUST-001 — Rahul Sharma, premium tier' },
  { ts: '17:42:03', status: 'COMPLETED',  tool: 'get_order',                  summary: 'Order ORD-1042 confirmed delivered 4 days ago, damaged_on_arrival' },
  { ts: '17:42:05', status: 'COMPLETED',  tool: 'check_resolution_eligibility', summary: 'Policy POL-DMG-01 satisfied — premium tier, within 7-day window' },
  { ts: '17:42:07', status: 'COMPLETED',  tool: 'get_inventory',              summary: 'Mumbai: 1 unit available — proceeding with replacement' },
  { ts: '17:42:09', status: 'BLOCKED',    tool: 'create_replacement',         summary: 'INVENTORY_UNAVAILABLE — competing reservation consumed last Mumbai unit' },
  { ts: '17:42:10', status: 'REPLANNING', tool: 'search_inventory',           summary: 'Inventory conflict detected. Searching alternate warehouses...' },
  { ts: '17:42:12', status: 'COMPLETED',  tool: 'reserve_inventory',          summary: 'Pune: 2 units available — reserving 1 unit for replacement' },
  { ts: '17:42:14', status: 'VERIFIED',   tool: 'verify_resolution',          summary: 'Replacement confirmed. Order status updated. Case resolved.' },
]

const statusColors: Record<string, string> = {
  RUNNING: '#d4834a', COMPLETED: '#4aba8a', BLOCKED: '#c96b60',
  REPLANNING: '#d4ad4a', VERIFIED: '#4aba8a', FAILED: '#c96b60',
}

const capabilityGrid = [
  {
    label: 'Goal-driven execution',
    desc: 'Receives a customer objective, not a script. Autonomously selects which tool to call next based on what it learns.',
  },
  {
    label: 'Dynamic tool selection',
    desc: '13 real backend tools — inventory, orders, policies, replacements. LLM plans; the backend executes against real DB state.',
  },
  {
    label: 'Failure detection and replanning',
    desc: 'Observes real INVENTORY_UNAVAILABLE errors. Does not fall back to a hardcoded path — it re-queries and finds alternatives.',
  },
  {
    label: 'Independent verification',
    desc: 'Calls verify_resolution as a final check. Validates the DB state independently before marking the case resolved.',
  },
]

export default function HomePage() {
  const router = useRouter()
  const [demoLoading, setDemoLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  const handleLaunchDemo = async () => {
    setDemoLoading(true)
    try {
      await api.runDemo()
      router.push('/cases/CASE-DEMO-001')
    } catch {
      alert('Failed to start demo. Is the backend running?')
      setDemoLoading(false)
    }
  }

  const handleReset = async () => {
    setResetLoading(true)
    setResetMsg(null)
    try {
      await api.resetDemo()
      setResetMsg('Demo state restored.')
    } catch {
      setResetMsg('Reset failed — is the backend running?')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <NavShell>
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <div style={{ padding: '3rem 2.5rem 2.5rem', maxWidth: 1100, margin: '0 auto' }}>

        {/* Eyebrow + headline */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
            <div style={{
              padding: '0.1875rem 0.5rem',
              borderRadius: 3,
              background: 'var(--signal-tint)',
              color: 'var(--signal)',
              fontSize: '0.625rem',
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.07em',
              border: '1px solid rgba(193,99,30,0.2)',
            }}>
              AGENTIC AI
            </div>
            <div style={{ width: 1, height: 12, background: 'var(--line)' }} />
            <div style={{ color: 'var(--ink-muted)', fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
              Tech Zephyr 4.0 Hackathon
            </div>
          </div>

          <h1 style={{
            fontSize: '2.25rem', fontWeight: 600, color: 'var(--ink)',
            lineHeight: 1.1, letterSpacing: '-0.025em',
            marginBottom: '1rem', maxWidth: 600,
          }}>
            ResolveAI
          </h1>
          <p style={{
            fontSize: '1rem', color: 'var(--ink-muted)',
            maxWidth: 540, lineHeight: 1.65, marginBottom: '0.75rem',
          }}>
            An autonomous resolution agent that investigates customer issues, executes real actions, adapts when they fail, and verifies the outcome — without human intervention.
          </p>
          <p style={{
            fontSize: '0.875rem', color: 'var(--ink-faint)',
            maxWidth: 480, lineHeight: 1.6,
            borderLeft: '2px solid var(--line)', paddingLeft: '0.75rem',
          }}>
            Not a chatbot. Not a FAQ engine. A goal-driven agent that operates enterprise systems, detects real conflicts in real time, replans, and resolves.
          </p>
        </div>

        {/* CTA row */}
        <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '3rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            id="btn-launch-demo"
            className="btn btn-primary"
            onClick={handleLaunchDemo}
            disabled={demoLoading}
            style={{ fontSize: '0.9375rem', padding: '0.625rem 1.25rem', gap: '0.5rem' }}
          >
            <Play />
            {demoLoading ? 'Starting...' : 'Launch Guided Demo'}
          </button>

          <Link
            href="/cases/new"
            id="btn-create-case"
            className="btn btn-secondary"
            style={{ fontSize: '0.9375rem', padding: '0.625rem 1.25rem' }}
          >
            Create Case
          </Link>

          <button
            id="btn-reset-demo"
            className="btn btn-ghost"
            onClick={handleReset}
            disabled={resetLoading}
            style={{ fontSize: '0.875rem' }}
          >
            <RefreshCw />
            {resetLoading ? 'Resetting...' : 'Reset Demo'}
          </button>

          {resetMsg && (
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
              {resetMsg}
            </span>
          )}
        </div>

        {/* Two-column layout: preview log + workflow */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', marginBottom: '3rem', alignItems: 'start' }}>

          {/* Live ops log preview */}
          <div style={{
            background: 'var(--dark-surface)',
            border: '1px solid var(--dark-line)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '0.625rem 1rem',
              borderBottom: '1px solid var(--dark-line)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--dark-surface-raised)',
            }}>
              <span style={{
                fontSize: '0.6875rem', fontWeight: 600,
                color: 'var(--dark-ink-muted)', letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                Operations Log — CASE-DEMO-001
              </span>
              <span className="status-pill resolved" style={{ fontSize: '0.5625rem' }}>RESOLVED</span>
            </div>

            <div style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              {previewEvents.map((ev, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '68px 84px 1fr',
                  gap: '0.5rem',
                  padding: '0.4375rem 1rem',
                  borderBottom: i < previewEvents.length - 1 ? '1px solid var(--dark-line)' : 'none',
                  borderLeft: `3px solid ${ev.status === 'BLOCKED' ? 'var(--error)' : ev.status === 'REPLANNING' ? 'var(--warning)' : ev.status === 'VERIFIED' ? 'var(--success)' : 'transparent'}`,
                  background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                }}>
                  <span style={{ fontSize: '0.5625rem', color: 'var(--dark-ink-faint)', paddingTop: 2 }}>{ev.ts}</span>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 500, paddingTop: 2, letterSpacing: '0.04em', color: statusColors[ev.status] || 'var(--dark-ink-muted)', textTransform: 'uppercase' }}>
                    {ev.status}
                  </span>
                  <div>
                    <span style={{ fontSize: '0.5625rem', color: 'var(--dark-ink-faint)', display: 'block', marginBottom: 1 }}>{ev.tool}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--dark-ink)', lineHeight: 1.4 }}>{ev.summary}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow steps */}
          <div>
            <div style={{ fontSize: '0.625rem', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Agent Lifecycle
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {workflowSteps.map((step, i) => (
                <div key={step.id} style={{ display: 'flex', gap: 0 }}>
                  {/* Connector line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '0.75rem', width: 20, flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: step.id === 'adapt' ? 'var(--error-tint)' : 'var(--surface-raised)',
                      border: `1px solid ${step.id === 'adapt' ? 'rgba(166,58,46,0.3)' : 'var(--line)'}`,
                      color: step.id === 'adapt' ? 'var(--error)' : 'var(--ink-muted)',
                      flexShrink: 0,
                    }}>
                      {step.icon}
                    </div>
                    {i < workflowSteps.length - 1 && (
                      <div style={{ width: 1, flex: 1, minHeight: 12, background: 'var(--line)', margin: '3px 0' }} />
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: i < workflowSteps.length - 1 ? '0.875rem' : 0, paddingTop: '0.0625rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: step.id === 'adapt' ? 'var(--error)' : 'var(--ink)', marginBottom: '0.1875rem' }}>
                      {step.label}
                      {step.id === 'adapt' && (
                        <span className="conflict-badge" style={{ marginLeft: '0.5rem' }}>DIFFERENTIATOR</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capability grid */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Why this is agentic, not a chatbot
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1px',
            background: 'var(--line)',
            border: '1px solid var(--line)',
          }}>
            {capabilityGrid.map((item, i) => (
              <div key={i} style={{ padding: '1rem 1.25rem', background: 'var(--surface-raised)' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.4375rem' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}>
          {[
            { href: '/cases', label: 'View all cases' },
            { href: '/explorer', label: 'Data explorer' },
            { href: '/analytics', label: 'Analytics' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: '0.8125rem',
                color: 'var(--signal)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3125rem',
                transition: 'opacity 80ms',
              }}
            >
              {link.label}
              <ArrowRight />
            </Link>
          ))}
        </div>
      </div>
    </NavShell>
  )
}
