'use client'

import React, { useEffect } from 'react'
import { IconClose, IconCheck, IconAlert, IconShield, IconTruck, IconBox, IconSpark, IconDatabase, IconFileText } from './icons'

export type DiagramType = 'stock-allocation' | 'execution-trace'

interface DiagramModalProps {
  type: DiagramType | null
  onClose: () => void
}

export function DiagramModal({ type, onClose }: DiagramModalProps) {
  useEffect(() => {
    if (!type) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [type, onClose])

  if (!type) return null

  return (
    <div className="diag-modal-backdrop" onClick={onClose}>
      <div className="diag-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="diag-modal-head">
          <div>
            <strong>
              {type === 'stock-allocation'
                ? 'Regional Multi-Hub Stock Allocation & Failover'
                : 'Closed-Loop Execution & Cryptographic Audit Ledger'}
            </strong>
            <small>
              {type === 'stock-allocation'
                ? 'Autonomous warehouse routing with zero hallucinated inventory'
                : 'Deterministic multi-tier verification pipeline & immutable trace'}
            </small>
          </div>
          <button
            onClick={onClose}
            className="fl-icon-btn ghost"
            style={{ width: 32, height: 32 }}
            aria-label="Close diagram modal"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Modal Body: Large High-Resolution Schematic */}
        <div className="diag-modal-body">
          {type === 'stock-allocation' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Summary Banner */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconTruck size={20} color="#fff" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 600 }}>
                    Deterministic Stock Routing Case: PROD-HP01 (Wireless Headphones)
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
                    When primary warehouse (Mumbai Hub) is out of stock (0 units), ResolveAI dynamically replans and reroutes to secondary hub (Pune Hub: 2 units) with database row locking.
                  </p>
                </div>
              </div>

              {/* Large Flow Diagram */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px',
                  position: 'relative',
                }}
              >
                {/* Step 1: Customer Order Input */}
                <div
                  style={{
                    background: 'rgba(15, 28, 56, 0.85)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '18px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                      Step 1 · Order Intake
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px' }}>
                      ORD-1042
                    </span>
                  </div>
                  <strong style={{ fontSize: '16px', color: '#fff' }}>Customer Replacement Request</strong>
                  <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                    Customer Rahul Sharma requested replacement for damaged headphones. SKU: <code style={{ color: '#38bdf8' }}>WH-PRM-BLK-01</code>.
                  </p>
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '12px', color: '#94a3b8' }}>
                    Destination: Mumbai West
                  </div>
                </div>

                {/* Step 2: Mumbai Hub (Depleted) */}
                <div
                  style={{
                    background: 'rgba(40, 15, 25, 0.85)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '18px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>
                      Step 2 · Primary Warehouse
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      OUT OF STOCK
                    </span>
                  </div>
                  <strong style={{ fontSize: '16px', color: '#fff' }}>Mumbai Regional Hub</strong>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#f87171', letterSpacing: '-0.02em' }}>
                    0 Units
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                    Live stock query returned 0 available units. Agent detects stock depletion exception and triggers autonomous replanning without halting case.
                  </p>
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '12px', color: '#fca5a5' }}>
                    ⚠ Fallback to secondary hub initiated
                  </div>
                </div>

                {/* Step 3: Pune Hub (Allocated) */}
                <div
                  style={{
                    background: 'rgba(12, 38, 30, 0.85)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: '18px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' }}>
                      Step 3 · Secondary Warehouse
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      ALLOCATED
                    </span>
                  </div>
                  <strong style={{ fontSize: '16px', color: '#fff' }}>Pune Regional Hub</strong>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#4ade80', letterSpacing: '-0.02em' }}>
                    2 Units → 1 Reserved
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                    Pune Hub evaluated as optimal nearest depot. Agent reserves 1 unit, locks inventory row, and generates dispatch manifest.
                  </p>
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '12px', color: '#86efac' }}>
                    ✓ Order REP-1042-PUNE confirmed
                  </div>
                </div>
              </div>

              {/* Bottom Policy Citation */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12.5px',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                <span><b>Policy Rule POL-DMG-01:</b> Multi-hub stock allocation permitted for damaged arrivals within 7 days.</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>Zero Hallucination Verified</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Summary Banner */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: 'rgba(129, 140, 248, 0.1)',
                  border: '1px solid rgba(129, 140, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconShield size={20} color="#fff" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 600 }}>
                    Dual-Tier LLM Architecture & Closed-Loop DB Audit Ledger
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
                    Every single agent reasoning turn, tool invocation, and warehouse transaction is logged to an immutable SQLite database table with full audit trail.
                  </p>
                </div>
              </div>

              {/* 5-Stage Step By Step Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  {
                    stage: '01',
                    title: 'Dispute Ingestion (Mic / CSV / Chat)',
                    desc: 'Speech Recognition mic audio captured in 44.1 kHz PCM, transcribed with 99.4% confidence and normalized into structured case parameters.',
                    tag: 'INPUT INGESTION',
                    color: '#38bdf8',
                  },
                  {
                    stage: '02',
                    title: 'Evidence Gathering & Carrier Verification',
                    desc: 'Manifest verification tool inspects Bluedart carrier tracking (BD-90412). Confirmed delivery 2 days ago; within 7-day reporting limit.',
                    tag: 'PURE EVIDENCE',
                    color: '#60a5fa',
                  },
                  {
                    stage: '03',
                    title: 'Dual-Tier Decision Engine Evaluation',
                    desc: 'Gemini 2.0 Flash performs primary reasoning. Automatic failover to Groq GPT-OSS 120B fallback prevents downtime or dropped cases.',
                    tag: 'TWO-TIER AI',
                    color: '#a78bfa',
                  },
                  {
                    stage: '04',
                    title: 'Deterministic Policy Enforcement',
                    desc: 'Evaluates POL-DMG-01 rules deterministically in application code, never relying on LLM guesses. Replacement verdict authorized.',
                    tag: 'POLICY ENGINE',
                    color: '#34d399',
                  },
                  {
                    stage: '05',
                    title: 'Closed-Loop Execution & DB Event Record',
                    desc: 'Dispatches replacement REP-1042-PUNE, reserves inventory, drafts customer email, and inserts immutable row in agent_events ledger.',
                    tag: 'AUDIT LEDGER',
                    color: '#f59e0b',
                  },
                ].map((s) => (
                  <div
                    key={s.stage}
                    style={{
                      background: 'rgba(15, 28, 56, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: s.color,
                        background: 'rgba(255, 255, 255, 0.06)',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {s.stage}
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '14px', color: '#fff', display: 'block', marginBottom: '2px' }}>
                        {s.title}
                      </strong>
                      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
                        {s.desc}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: s.color,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${s.color}40`,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

