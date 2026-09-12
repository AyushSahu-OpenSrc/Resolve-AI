'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'

// Lucide-style SVG icons
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const Play = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)

const RefreshCw = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
)

// Workflow step icons
const stepIcons = {
  goal: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  observe: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  decide: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  act: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  adapt: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
    </svg>
  ),
  verify: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
}

const workflowSteps = [
  { id: 'goal', label: 'Goal', icon: stepIcons.goal },
  { id: 'observe', label: 'Evidence', icon: stepIcons.observe },
  { id: 'decide', label: 'Decision', icon: stepIcons.decide },
  { id: 'act', label: 'Action', icon: stepIcons.act },
  { id: 'adapt', label: 'Adapt', icon: stepIcons.adapt },
  { id: 'verify', label: 'Verify', icon: stepIcons.verify },
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
    } catch (e) {
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
    } catch (e) {
      setResetMsg('Reset failed — is the backend running?')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <NavShell>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{
              padding: '0.2rem 0.5rem', borderRadius: 4,
              background: 'var(--signal-tint)', color: 'var(--signal)',
              fontSize: '0.75rem', fontWeight: 600,
              fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.02em',
            }}>
              AGENTIC AI
            </div>
            <div style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>Tech Zephyr 4.0 Hackathon</div>
          </div>

          <h1 style={{
            fontSize: '2rem', fontWeight: 600, color: 'var(--ink)',
            lineHeight: 1.2, marginBottom: '1rem', maxWidth: 560,
          }}>
            ResolveAI
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--ink-muted)', maxWidth: 560, lineHeight: 1.6, marginBottom: '0.75rem' }}>
            An autonomous resolution agent that investigates customer issues, executes real actions, 
            adapts when they fail, and verifies the outcome — without human intervention.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)', maxWidth: 520, lineHeight: 1.6 }}>
            Not a chatbot. Not a FAQ engine. A goal-driven agent that operates enterprise systems, 
            detects conflicts in real time, replans, and resolves.
          </p>
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '3rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleLaunchDemo}
            disabled={demoLoading}
            style={{ fontSize: '0.9375rem', padding: '0.625rem 1.25rem', gap: '0.5rem' }}
          >
            <Play />
            {demoLoading ? 'Starting...' : 'Launch Guided Demo'}
          </button>

          <Link href="/cases/new" className="btn btn-secondary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.25rem' }}>
            Create Case
          </Link>

          <button
            className="btn btn-ghost"
            onClick={handleReset}
            disabled={resetLoading}
            style={{ fontSize: '0.875rem' }}
          >
            <RefreshCw />
            {resetLoading ? 'Resetting...' : 'Reset Demo'}
          </button>

          {resetMsg && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>{resetMsg}</span>
          )}
        </div>

        {/* Workflow diagram */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '1rem', letterSpacing: '0.03em' }}>
            THE AGENT LIFECYCLE
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            padding: '1.5rem',
            background: 'var(--surface-raised)',
            border: '1px solid var(--line)',
            overflowX: 'auto',
          }}>
            {workflowSteps.map((step, i) => (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div className="workflow-step">
                  <div className="workflow-node" style={{
                    background: i === 4 ? 'var(--error-tint)' : 'var(--surface-raised)',
                    borderColor: i === 4 ? 'var(--error)' : 'var(--line)',
                    color: i === 4 ? 'var(--error)' : 'var(--ink-muted)',
                  }}>
                    {step.icon}
                  </div>
                  <div className="workflow-label" style={{ color: i === 4 ? 'var(--error)' : undefined }}>
                    {step.label}
                  </div>
                </div>
                {i < workflowSteps.length - 1 && (
                  <div style={{ width: 32, height: 1, background: 'var(--line)', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
            The Adapt step is the differentiator — when the first action fails, the agent detects the real failure, 
            searches alternatives, and completes the resolution without human intervention.
          </div>
        </div>

        {/* What makes it agentic */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '1rem', letterSpacing: '0.03em' }}>
            WHY THIS IS AGENTIC, NOT A CHATBOT
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1px', background: 'var(--line)',
            border: '1px solid var(--line)',
          }}>
            {[
              { label: 'Goal-driven', desc: 'Receives an objective, not a script. Decides its own tool sequence.' },
              { label: 'Dynamic tool selection', desc: 'Calls 13 real backend tools. LLM plans; backend executes.' },
              { label: 'Adaptation', desc: 'Detects real inventory conflicts. Replans immediately. No scripted fallback.' },
              { label: 'Verification', desc: 'Calls verify_resolution before declaring success. Checks DB state independently.' },
            ].map(item => (
              <div key={item.label} style={{ padding: '1.25rem', background: 'var(--surface-raised)' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.5rem' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { href: '/cases', label: 'View all cases' },
            { href: '/explorer', label: 'Data explorer' },
            { href: '/analytics', label: 'Analytics' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{ fontSize: '0.875rem', color: 'var(--signal)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
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
