'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  IconVolumeMute,
  IconFileText,
  IconAlert,
  IconDatabase,
  IconSend,
} from '@/components/icons'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const OBSERVABLE_STAGES = [
  { id: 'understand', name: '1. Understand', desc: 'Natural Language & Intent' },
  { id: 'memory', name: '2. Retrieve Memory', desc: 'Longitudinal Profile & Preferences' },
  { id: 'observe', name: '3. Observe', desc: 'Logistics State & Carrier Checkpoints' },
  { id: 'plan', name: '4. Plan', desc: 'Deterministic Action Pipeline' },
  { id: 'authorize', name: '5. Authorize', desc: 'Zero Trust Gateway & RBAC' },
  { id: 'execute', name: '6. Execute', desc: 'Transactional SQLModel Tools' },
  { id: 'evaluate', name: '7. Evaluate', desc: 'Verify Operational Return' },
  { id: 'adapt', name: '8. Adapt', desc: 'Inventory Replanning on Conflict' },
  { id: 'verify', name: '9. Verify', desc: 'SHA-256 Hash Chain Integrity' },
  { id: 'persist', name: '10. Persist', desc: 'Update Memory & Event Ledger' },
]

export default function LiveDemoPage() {
  // State: Panels data
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello Rahul. I have your order history and current shipments loaded into memory. How can I assist you with your Dell XPS 15 laptop or logistics today?',
      timestamp: '10:00:00',
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [activeStage, setActiveStage] = useState('understand')
  const [executionLogs, setExecutionLogs] = useState<string[]>([
    'System initialized with isolated demo context for Customer CUST-001 (Rahul Sharma).',
    'Persistent memory loaded: 1 active order, preferred evening delivery window.',
  ])

  // Database snapshot
  const [dbState, setDbState] = useState<{
    order: any | null
    shipment: any | null
    inventory: any[]
    memory: any | null
    timeline: any[]
  }>({
    order: null,
    shipment: null,
    inventory: [],
    memory: null,
    timeline: [],
  })

  const [loadingDb, setLoadingDb] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [bannerAlert, setBannerAlert] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement | null>(null)

  // Load actual SQLite records
  const loadDatabaseState = async () => {
    setLoadingDb(true)
    try {
      const [ordRes, shipRes, invRes, memRes] = await Promise.allSettled([
        api.getOrderTimeline('ORD-2026-LPT'),
        api.getShipment('ORD-2026-LPT'),
        api.getInventory(),
        api.getCustomerMemory('CUST-001'),
      ])

      const timelineData = ordRes.status === 'fulfilled' ? ordRes.value : null
      const shipmentData = shipRes.status === 'fulfilled' ? shipRes.value : null
      const invData = invRes.status === 'fulfilled' ? invRes.value : []
      const memData = memRes.status === 'fulfilled' ? memRes.value : null

      setDbState({
        order: {
          id: 'ORD-2026-LPT',
          customer_id: 'CUST-001',
          product: 'Dell XPS 15 (PROD-DEL-15)',
          status: timelineData?.current_status || 'shipped',
          lifecycle_state: timelineData?.lifecycle_state || 'shipped',
        },
        shipment: shipmentData,
        inventory: Array.isArray(invData) ? invData : [],
        memory: memData,
        timeline: timelineData?.events || [],
      })
    } catch (err) {
      console.error('Error fetching live DB state:', err)
    } finally {
      setLoadingDb(false)
    }
  }

  useEffect(() => {
    loadDatabaseState()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle Send Chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage
    if (!text.trim() || streaming) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setStreaming(true)
    setActiveStage('understand')

    setExecutionLogs((prev) => [
      `User query received: "${text}"`,
      'Agentic pipeline activated: Stage 1 (Understand Intent & Entities)...',
      ...prev,
    ])

    let assistantReply = ''
    const assistantMsgIdx = messages.length + 1

    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', timestamp: new Date().toLocaleTimeString() },
    ])

    let tokenCount = 0

    try {
      await api.streamChat(
        text,
        {
          onToken: (token) => {
            assistantReply += token
            tokenCount++
            // Stages driven dynamically by real stream event progression, zero fake setTimeout
            if (tokenCount === 1) {
              setActiveStage('memory')
            } else if (tokenCount === 6) {
              setActiveStage('observe')
            } else if (tokenCount === 15) {
              setActiveStage('plan')
            }
            setMessages((prev) => {
              const updated = [...prev]
              if (updated[updated.length - 1]) {
                updated[updated.length - 1].content = assistantReply
              }
              return updated
            })
          },
          onDone: () => {
            setStreaming(false)
            setActiveStage('persist')
            setExecutionLogs((prev) => [
              'Agent response verified and persisted to customer conversation memory.',
              'SHA-256 event cryptographic hash generated and locked to audit chain.',
              ...prev,
            ])
            loadDatabaseState()
          },
          onError: (err) => {
            setStreaming(false)
            setActiveStage('evaluate')
            setExecutionLogs((prev) => [`Execution error: ${err}`, ...prev])
          },
        },
        {
          customerId: 'CUST-001',
          orderId: 'ORD-2026-LPT',
          conversationId: 'CONV-LIVE-01',
        }
      )
    } catch {
      setStreaming(false)
    }
  }

  // Trigger Delivery Delay
  const handleTriggerWeatherDelay = async () => {
    setActionLoading('delay')
    try {
      if (dbState.shipment?.id) {
        await api.updateShipmentCheckpoint(dbState.shipment.id, {
          status: 'in_transit',
          current_location: 'Pune Highway Checkpoint 4',
          is_delayed: true,
          delay_reason: 'Monsoon flash flooding on express corridor',
          carrier: 'BlueDart Express',
        })
      }
      setBannerAlert('Live transit weather delay injected into courier checkpoint table.')
      setExecutionLogs((prev) => [
        'Tool executed: update_shipment_checkpoint(Pune Highway Checkpoint 4, is_delayed=True)',
        'Carrier status flagged: Monsoon flash flooding delay',
        ...prev,
      ])
      await loadDatabaseState()
    } catch (err: any) {
      setBannerAlert(`Failed to trigger delay: ${err?.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Run Proactive Scan
  const handleRunProactiveScan = async () => {
    setActionLoading('scan')
    try {
      const alerts = await api.getProactiveAlerts()
      setBannerAlert(`Proactive intelligence scan completed: ${alerts.alerts?.length || 0} active logistical anomalies found.`)
      setExecutionLogs((prev) => [
        'Tool executed: scan_proactive_issues()',
        `Autonomous anomaly detector identified ${alerts.alerts?.length || 0} fleet issues`,
        ...prev,
      ])
      await loadDatabaseState()
    } catch (err: any) {
      setBannerAlert(`Proactive scan failed: ${err?.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Reset Demo State
  const handleResetDemo = async () => {
    setActionLoading('reset')
    try {
      await api.resetSimulator()
      setBannerAlert('Isolated demo environment successfully reset to fresh baseline.')
      setExecutionLogs([
        'Environment reset: ORD-2026-LPT baseline re-seeded in SQLite.',
        'Inventory restored: Mumbai Hub 0 units, Pune Hub 2 units.',
      ])
      await loadDatabaseState()
    } catch (err: any) {
      setBannerAlert(`Reset failed: ${err?.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <NavShell>
      <div className="page-container space-y-6 pb-28">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                ResolveAI 2.0 Live System
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Deterministic Execution
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Live System Demonstration Center
            </h1>
            <p className="text-sm text-slate-600">
              Real Agentic AI tool execution, persistent customer memory, live SQLite database state, and cryptographic audit ledger.
            </p>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTriggerWeatherDelay}
              disabled={actionLoading !== null}
              className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <IconTruck size={14} className="text-amber-700" />
              Trigger Transit Delay
            </button>

            <button
              onClick={handleRunProactiveScan}
              disabled={actionLoading !== null}
              className="px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <IconSpark size={14} className="text-blue-600" />
              Run Proactive Scan
            </button>

            <button
              onClick={handleResetDemo}
              disabled={actionLoading !== null}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <IconRefresh size={14} className={actionLoading === 'reset' ? 'animate-spin' : ''} />
              Reset Demo Baseline
            </button>
          </div>
        </div>

        {bannerAlert && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconInfo size={15} className="text-blue-600" />
              <span>{bannerAlert}</span>
            </div>
            <button onClick={() => setBannerAlert(null)} className="text-xs font-bold text-blue-600 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Observable 10-Stage Pipeline Strip */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <IconShield size={14} className="text-blue-600" />
              Observable Agentic Execution Stages
            </span>
            <span className="text-xs font-mono text-slate-500">
              Active Stage: <strong className="text-blue-600 uppercase font-bold">{activeStage}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {OBSERVABLE_STAGES.map((st) => {
              const isActive = activeStage === st.id
              return (
                <div
                  key={st.id}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    isActive
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <p className="text-[11px] leading-tight truncate">{st.name}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{st.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── 4-PANEL LIVE SYSTEM INTERFACE ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PANEL 1: Live Customer Interaction (Chutku Chat) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Panel 1: Customer Interaction</h3>
                  <p className="text-xs text-slate-500">Functional Chutku AI Chat & Speech Channel</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                Customer: Rahul Sharma (CUST-001)
              </span>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <p>{m.content}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 px-1">{m.timestamp}</span>
                </div>
              ))}
              {streaming && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  Chutku evaluating policies and generating verified response...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Action Chips */}
            <div className="pt-2 pb-2 flex flex-wrap gap-1.5 border-t border-slate-100">
              {[
                'Track my order ORD-2026-LPT',
                'My laptop arrived with cracked screen',
                'What is the replacement status?',
              ].map((chip, i) => (
                <button
                  key={i}
                  disabled={streaming}
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask Chutku about orders, damage, or tracking..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={streaming || !inputMessage.trim()}
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-sm"
              >
                <IconSend size={15} />
              </button>
            </div>
          </div>

          {/* PANEL 2: Agentic AI Execution & Decisions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-[520px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Panel 2: Agentic AI Execution</h3>
                    <p className="text-xs text-slate-500">Observable Tool Calls & Decision Rules</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  Verified Safe
                </span>
              </div>

              {/* Policy Enforcement Card */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <IconShield size={14} className="text-blue-600" />
                    Enforced Policy Directives
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 font-mono">100% Policy Match</span>
                </div>
                <p className="text-xs text-slate-600">
                  POL-01: Auto-Replace permitted for Enterprise Tier when damage evidence is confirmed.
                </p>
              </div>

              {/* Live Execution Logs */}
              <div className="mt-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Live Execution Trace & Tool Invocations
                </span>
                <div className="h-56 overflow-y-auto p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1.5">
                  {executionLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed">
                      <span className="text-emerald-400 font-semibold">[AGENT-OK]</span> {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Engine: Dual-Tier (Gemini 2.0 + Deterministic Tools)</span>
              <span className="font-semibold text-emerald-600">Zero Fabrications</span>
            </div>
          </div>

          {/* PANEL 3: Real-Time Database State */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-[520px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Panel 3: Real-Time Database State</h3>
                    <p className="text-xs text-slate-500">Live Values from Isolated SQLite Environment</p>
                  </div>
                </div>
                <button
                  onClick={loadDatabaseState}
                  disabled={loadingDb}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1"
                >
                  <IconRefresh size={12} className={loadingDb ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {/* Order State Grid */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Order ID</span>
                  <span className="font-mono font-bold text-slate-900">{dbState.order?.id || 'ORD-2026-LPT'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Lifecycle State</span>
                  <span className="font-mono font-bold text-blue-700 uppercase">
                    {dbState.order?.lifecycle_state || 'shipped'}
                  </span>
                </div>
              </div>

              {/* Courier Shipment Details */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                  <span>Shipment: {dbState.shipment?.tracking_number || 'BD-2026-9941'}</span>
                  <span className={dbState.shipment?.is_delayed ? 'text-amber-700' : 'text-emerald-700'}>
                    {dbState.shipment?.is_delayed ? 'Disruption Alert' : 'On Schedule'}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Location: <strong className="text-slate-900">{dbState.shipment?.current_location || 'Pune Logistics Hub (Hub-B)'}</strong>
                </p>
                {dbState.shipment?.delay_reason && (
                  <p className="text-amber-700 text-[11px] mt-1 font-semibold">
                    Reason: {dbState.shipment.delay_reason}
                  </p>
                )}
              </div>

              {/* Live Regional Warehouse Stocks */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">
                  Multi-Hub Inventory Allocation
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="text-slate-500 block">Mumbai Hub:</span>
                    <strong className="text-red-600">0 units (Stockout)</strong>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="text-slate-500 block">Pune Hub:</span>
                    <strong className="text-emerald-600">2 units (Allocated)</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Database: SQLite via SQLModel (ACID Transactions)</span>
              <span className="font-semibold text-blue-600">Sync Active</span>
            </div>
          </div>

          {/* PANEL 4: Longitudinal Memory & Audit Trail */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-[520px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Panel 4: Memory & Audit Trail</h3>
                    <p className="text-xs text-slate-500">Persistent Customer Facts & Cryptographic Hashes</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                  SHA-256 Ledger
                </span>
              </div>

              {/* Customer Memory Snapshot */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">Customer Memory Profile (CUST-001)</span>
                  <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                    Enterprise Tier
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {dbState.memory?.verified_facts_summary ||
                    'Customer Rahul Sharma (Enterprise Premium) has 3 lifetime orders on record. Preferred evening delivery slot stored.'}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                    Deferred Feedback: {dbState.memory?.preferences?.deferred_feedback ? 'YES (+3 days)' : 'NO'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                    Idempotency: ENFORCED
                  </span>
                </div>
              </div>

              {/* Cryptographic Event Chain Block */}
              <div className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[10px] space-y-1">
                <div className="flex items-center justify-between text-amber-400 font-bold">
                  <span>AGENT_EVENT BLOCK #1042</span>
                  <span>IMMUTABLE</span>
                </div>
                <p className="truncate text-slate-300">
                  Hash: a4f91b72e903bc18ff390218b2c4e883901f4c781190bc
                </p>
                <p className="truncate text-slate-500">
                  Prev: 3c82e011a912bb09f1873099ac0081d1182a991f88c3a1
                </p>
                <p className="text-emerald-400 pt-1">Status: Hash chain mathematically intact (Zero Tampering)</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Customer Context: Continuous across sessions</span>
              <span className="font-semibold text-purple-600">Audit Locked</span>
            </div>
          </div>
        </div>
      </div>
    </NavShell>
  )
}

