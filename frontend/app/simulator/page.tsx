'use client'

import React, { useState, useEffect } from 'react'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'
import {
  IconBox,
  IconClock,
  IconCheck,
  IconChevronRight,
  IconFlame,
  IconInfo,
  IconPlay,
  IconRefresh,
  IconShield,
  IconSpark,
  IconTruck,
  IconUsers,
  IconVolume,
} from '@/components/icons'

interface SimStep {
  step: number
  title: string
  status: string
  timestamp: string
  details: Record<string, unknown>
}

interface SimResult {
  status: string
  scenario: string
  customer_id: string
  order_id: string
  product: string
  final_reply: string
  steps: SimStep[]
}

export default function SimulatorPage() {
  const [running, setRunning] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [simData, setSimData] = useState<SimResult | null>(null)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [statusInfo, setStatusInfo] = useState<any>(null)
  const [memorySnapshot, setMemorySnapshot] = useState<any>(null)
  const [showMemory, setShowMemory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)

  const loadStatus = async () => {
    try {
      const data = await api.getSimulatorStatus()
      setStatusInfo(data)
    } catch (e) {
      // ignore on initial load
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    try {
      const res = (await api.runSimulator()) as SimResult
      setSimData(res)
      await loadStatus()
      // Auto-fetch customer memory snapshot
      const mem = await api.getCustomerMemory('CUST-001')
      setMemorySnapshot(mem)
    } catch (err: any) {
      setError(err?.message || 'Simulator failed to execute')
    } finally {
      setRunning(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    setError(null)
    try {
      await api.resetSimulator()
      setSimData(null)
      setMemorySnapshot(null)
      await loadStatus()
    } catch (err: any) {
      setError(err?.message || 'Simulator reset failed')
    } finally {
      setResetting(false)
    }
  }

  const handleSpeak = async (text: string) => {
    if (!text || typeof window === 'undefined') return
    try {
      setSpeaking(true)
      const res = await api.generateTts({ text, voice_id: 'neerja' })
      if (res.ok) {
        const blob = await res.blob()
        const audio = new Audio(URL.createObjectURL(blob))
        audio.onended = () => setSpeaking(false)
        audio.play()
      } else {
        setSpeaking(false)
      }
    } catch {
      setSpeaking(false)
    }
  }

  const badgeColor = (status: string) => {
    const s = (status || '').toUpperCase()
    if (s === 'COMPLETED' || s === 'DELIVERED' || s === 'VERIFIED') return 'rgba(34, 197, 94, 0.2)'
    if (s === 'DETECTED' || s === 'NOTIFIED') return 'rgba(234, 179, 8, 0.2)'
    if (s === 'DISPATCHED') return 'rgba(56, 189, 248, 0.2)'
    if (s === 'DEFERRED') return 'rgba(168, 85, 247, 0.2)'
    return 'rgba(148, 163, 184, 0.2)'
  }

  const badgeText = (status: string) => {
    const s = (status || '').toUpperCase()
    if (s === 'COMPLETED' || s === 'DELIVERED' || s === 'VERIFIED') return '#4ade80'
    if (s === 'DETECTED' || s === 'NOTIFIED') return '#facc15'
    if (s === 'DISPATCHED') return '#38bdf8'
    if (s === 'DEFERRED') return '#c084fc'
    return '#94a3b8'
  }

  return (
    <NavShell>
      <div className="fl-dashboard" style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
        {/* Header Section */}
        <header style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 10px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '20px', fontSize: '11px', color: '#38bdf8', fontWeight: 600, marginBottom: '8px' }}>
              <IconSpark size={12} /> RESOLVEAI 2.0 HACKATHON DEMO SIMULATOR
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
              Laptop Order Lifecycle & Autonomous Resolution
            </h1>
            <p style={{ color: 'var(--fg-muted, #94a3b8)', margin: 0, fontSize: '14px', maxWidth: '780px' }}>
              Verifiable end-to-end execution across the customer order journey: proactive transit delay detection, polite feedback deferral, long-term memory recall, deterministic warranty validation, and multi-hub stock rerouting.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleReset}
              disabled={resetting || running}
              className="fl-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconRefresh size={14} className={resetting ? 'animate-spin' : ''} />
              {resetting ? 'Resetting…' : 'Reset Scenario'}
            </button>
            <button
              onClick={handleRun}
              disabled={running}
              className="fl-btn primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconPlay size={14} />
              {running ? 'Executing Autonomous Workflow…' : 'Run Full Simulation'}
            </button>
          </div>
        </header>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* 4 Feature Highlights Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          <div className="fl-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '8px', color: '#38bdf8' }}>
                <IconTruck size={18} />
              </span>
              <div>
                <strong style={{ fontSize: '13px' }}>Proactive Delay Detection</strong>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--fg-muted)' }}>Background Logistics Scanner</p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--fg-muted)' }}>
              Identifies highway route disruption at Pune Hub and notifies customer with ETA before they complain.
            </p>
          </div>

          <div className="fl-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px', color: '#c084fc' }}>
                <IconClock size={18} />
              </span>
              <div>
                <strong style={{ fontSize: '13px' }}>Polite Feedback Deferral</strong>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--fg-muted)' }}>Respects Customer Intent</p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--fg-muted)' }}>
              When customer defers review (&quot;I&apos;ll test it later&quot;), agent records preference and postpones follow-up.
            </p>
          </div>

          <div className="fl-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.15)', borderRadius: '8px', color: '#4ade80' }}>
                <IconShield size={18} />
              </span>
              <div>
                <strong style={{ fontSize: '13px' }}>Persistent Relational Memory</strong>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--fg-muted)' }}>Cross-Visit Context Recall</p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--fg-muted)' }}>
              Recalls earlier weather delay and order history when customer returns later with a display defect.
            </p>
          </div>

          <div className="fl-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ padding: '8px', background: 'rgba(234, 179, 8, 0.15)', borderRadius: '8px', color: '#facc15' }}>
                <IconBox size={18} />
              </span>
              <div>
                <strong style={{ fontSize: '13px' }}>Multi-Hub Stock Replanning</strong>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--fg-muted)' }}>Zero-Hallucination Allocation</p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--fg-muted)' }}>
              Mumbai Hub is depleted (0 units). Autonomous agent instantly reroutes stock allocation to Pune Hub.
            </p>
          </div>
        </section>

        {/* Live Simulation Execution Results */}
        {simData && (
          <div style={{ marginBottom: '32px' }}>
            {/* Final AI Speech & Explanation Card */}
            <div className="fl-card" style={{ padding: '20px', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Unified Agent Resolution Output (Chutku)
                </span>
                <button
                  onClick={() => handleSpeak(simData.final_reply)}
                  disabled={speaking}
                  className="fl-btn sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <IconVolume size={13} />
                  {speaking ? 'Speaking Voice…' : 'Play Audio Speech'}
                </button>
              </div>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--fg, #f8fafc)', margin: 0, fontWeight: 500 }}>
                &ldquo;{simData.final_reply}&rdquo;
              </p>
            </div>

            {/* Execution Trace Timeline */}
            <div className="fl-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                    Autonomous Execution Trace ({simData.steps.length} Stages Verified)
                  </h2>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--fg-muted)' }}>
                    Each step executed against live SQLite database state with cryptographic audit logging.
                  </p>
                </div>
                {memorySnapshot && (
                  <button
                    onClick={() => setShowMemory(!showMemory)}
                    className="fl-btn sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <IconUsers size={13} />
                    {showMemory ? 'Hide Customer Memory' : 'Inspect Relational Memory'}
                  </button>
                )}
              </div>

              {/* Memory Inspector Drawer */}
              {showMemory && memorySnapshot && (
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                  <strong style={{ fontSize: '12px', color: '#38bdf8' }}>PERSISTENT MEMORY SNAPSHOT (CUST-001)</strong>
                  <pre style={{ fontSize: '11px', margin: '8px 0 0', overflowX: 'auto', color: '#94a3b8' }}>
                    {JSON.stringify(memorySnapshot, null, 2)}
                  </pre>
                </div>
              )}

              {/* Step by Step Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {simData.steps.map((st) => (
                  <div
                    key={st.step}
                    style={{
                      background: 'var(--card-bg, rgba(30, 41, 59, 0.4))',
                      border: '1px solid var(--border-color, rgba(148, 163, 184, 0.15))',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() => setExpandedStep(expandedStep === st.step ? null : st.step)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: badgeColor(st.status), color: badgeText(st.status), fontSize: '12px', fontWeight: 700 }}>
                          {st.step}
                        </span>
                        <strong style={{ fontSize: '14px' }}>{st.title}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: badgeColor(st.status), color: badgeText(st.status), fontWeight: 600 }}>
                          {st.status}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>{st.timestamp}</span>
                        <IconChevronRight size={14} style={{ transform: expandedStep === st.step ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      </div>
                    </div>

                    {expandedStep === st.step && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.1)', fontSize: '12px' }}>
                        <pre style={{ margin: 0, color: '#94a3b8', background: 'rgba(0, 0, 0, 0.2)', padding: '10px', borderRadius: '6px', overflowX: 'auto' }}>
                          {JSON.stringify(st.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Database Status Strip */}
        <footer style={{ marginTop: '24px', padding: '16px', background: 'var(--card-bg, rgba(30, 41, 59, 0.3))', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--fg-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconShield size={14} />
            <span>Target Order: <b>ORD-2026-LPT</b> · Customer: <b>Rahul Sharma (CUST-001)</b> · Product: <b>UltraBook Pro 16</b></span>
          </div>
          <div>
            <span>Verified Events in SQLite: <b>{statusInfo?.events_count || 0} events</b></span>
          </div>
        </footer>
      </div>
    </NavShell>
  )
}

