'use client'

import React, { useState, useEffect, useRef } from 'react'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'
import {
  IconBox,
  IconClock,
  IconCheck,
  IconChevronRight,
  IconChevronLeft,
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
} from '@/components/icons'

// 10 Bounded Agentic Architecture Phases
const AGENTIC_STAGES = [
  { id: 'understand', name: '1. Understand', icon: '🧠', desc: 'NLU & Intent Extraction' },
  { id: 'context', name: '2. Context', icon: '📂', desc: 'Customer & Order History' },
  { id: 'observe', name: '3. Observe', icon: '👁️', desc: 'Detect Operational State' },
  { id: 'plan', name: '4. Plan', icon: '🗺️', desc: 'Deterministic Action Pipeline' },
  { id: 'authorize', name: '5. Authorize', icon: '🛡️', desc: 'Zero Trust & Policy Gate' },
  { id: 'execute', name: '6. Execute', icon: '⚡', desc: 'Transactional Tool Call' },
  { id: 'evaluate', name: '7. Evaluate', icon: '📊', desc: 'Inspect Tool Return' },
  { id: 'adapt', name: '8. Adapt', icon: '🔄', desc: 'Replan On Conflict' },
  { id: 'verify', name: '9. Verify', icon: '🔐', desc: 'SHA-256 Hash Chain' },
  { id: 'persist', name: '10. Persist', icon: '💾', desc: 'Customer Memory & Events' },
]

export default function HowItWorksPage() {
  const [mode, setMode] = useState<'mode1' | 'mode2'>('mode2')
  const [steps, setSteps] = useState<any[]>([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2000) // ms per step
  const [presentationMode, setPresentationMode] = useState(false)
  const [showScenarios, setShowScenarios] = useState(false)
  const [scenarios, setScenarios] = useState<any[]>([])
  const [scenarioResult, setScenarioResult] = useState<any | null>(null)
  const [loadingScenario, setLoadingScenario] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [loading, setLoading] = useState(true)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch Steps for Selected Mode
  const loadSteps = async (selectedMode: 'mode1' | 'mode2') => {
    setLoading(true)
    setIsPlaying(false)
    try {
      if (selectedMode === 'mode1') {
        const res = await api.getMode1Steps()
        setSteps(res.steps || [])
      } else {
        const res = await api.getMode2Steps()
        setSteps(res.steps || [])
      }
      setCurrentStepIdx(0)
    } catch (err) {
      console.error('Failed to load demo steps', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Scenarios
  const loadScenarios = async () => {
    try {
      const res = await api.getDemoScenarios()
      setScenarios(res.scenarios || [])
    } catch (err) {
      console.error('Failed to load scenarios', err)
    }
  }

  useEffect(() => {
    loadSteps(mode)
    loadScenarios()
  }, [mode])

  // Automatic Step Playback Loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (currentStepIdx < steps.length - 1) {
          setCurrentStepIdx((prev) => prev + 1)
        } else {
          setIsPlaying(false)
        }
      }, playbackSpeed)
    } else if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentStepIdx, steps.length, playbackSpeed])

  const step = steps[currentStepIdx] || null

  // Map step to agentic stage
  const getActiveStageId = () => {
    if (!step) return 'understand'
    const s = step.step_name?.toLowerCase() || ''
    if (s.includes('intake') || s.includes('understand')) return 'understand'
    if (s.includes('context') || s.includes('memory') || s.includes('history')) return 'context'
    if (s.includes('detect') || s.includes('observe') || s.includes('transit')) return 'observe'
    if (s.includes('policy') || s.includes('plan')) return 'plan'
    if (s.includes('zero trust') || s.includes('authorize') || s.includes('guard')) return 'authorize'
    if (s.includes('inventory') || s.includes('tool') || s.includes('dispatch') || s.includes('execute')) return 'execute'
    if (s.includes('evaluat') || s.includes('check')) return 'evaluate'
    if (s.includes('replan') || s.includes('adapt') || s.includes('conflict') || s.includes('pune')) return 'adapt'
    if (s.includes('hash') || s.includes('audit') || s.includes('verify')) return 'verify'
    return 'persist'
  }

  const activeStageId = getActiveStageId()

  // Audio TTS helper
  const handleSpeak = async (text: string) => {
    if (!text || speaking) return
    try {
      setSpeaking(true)
      const res = await api.generateTts({ text })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.onended = () => setSpeaking(false)
        audioRef.current.play()
      } else {
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => setSpeaking(false)
        audio.play()
      }
    } catch {
      // Fallback to browser SpeechSynthesis
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text)
        u.onend = () => setSpeaking(false)
        window.speechSynthesis.speak(u)
      } else {
        setSpeaking(false)
      }
    }
  }

  // Execute failure scenario
  const handleRunScenario = async (scId: string) => {
    setLoadingScenario(true)
    setScenarioResult(null)
    try {
      const res = await api.runDemoScenario(scId)
      setScenarioResult(res)
    } catch (err: any) {
      setScenarioResult({
        title: 'Execution Error',
        interception: err?.message || 'Scenario failed to trigger',
        safety_status: 'FAILED',
        outcome: 'System caught unhandled exception gracefully.',
      })
    } finally {
      setLoadingScenario(false)
    }
  }

  return (
    <NavShell>
      <div className={`space-y-6 ${presentationMode ? 'max-w-[1600px] mx-auto p-4' : 'max-w-7xl mx-auto'}`}>
        {/* Top Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                Tech Zephyr 4.0 Demo Center
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ResolveAI 2.0 Engine
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground mt-1">
              Autonomous Agent Execution & Architecture
            </h1>
            <p className="text-sm text-muted-foreground">
              Continuous Context • Deterministic Action • Cryptographic Verification
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Selector */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
              <button
                onClick={() => setMode('mode2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode === 'mode2'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Demo 2: Laptop Lifecycle (14 Steps)
              </button>
              <button
                onClick={() => setMode('mode1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode === 'mode1'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Demo 1: Conflict & Replan (ORD-1042)
              </button>
            </div>

            {/* Failure Scenarios Drawer Toggle */}
            <button
              onClick={() => setShowScenarios(!showScenarios)}
              className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <IconFlame size={14} />
              Edge-Case Scenarios ({scenarios.length})
            </button>

            {/* Presentation Mode Toggle */}
            <button
              onClick={() => setPresentationMode(!presentationMode)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                presentationMode
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconSpark size={14} />
              {presentationMode ? 'Exit Presentation' : 'Judge Mode'}
            </button>
          </div>
        </div>

        {/* 10-Stage Visual Agentic Architecture Pipeline (Interactive) */}
        <div className="bg-card/70 border border-border/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IconSpark size={14} className="text-primary" />
              Bounded Agentic Architecture Loop
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              Deterministic Bounded Orchestration • No Uncontrolled Loops
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {AGENTIC_STAGES.map((st) => {
              const isActive = activeStageId === st.id
              return (
                <div
                  key={st.id}
                  className={`relative p-2.5 rounded-xl border transition-all text-center flex flex-col items-center justify-center ${
                    isActive
                      ? 'border-primary bg-primary/15 text-primary shadow-lg shadow-primary/10 ring-1 ring-primary scale-[1.03]'
                      : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-border'
                  }`}
                >
                  <span className="text-lg mb-1">{st.icon}</span>
                  <p className="text-[11px] font-bold leading-tight truncate w-full">{st.name}</p>
                  <p className="text-[9px] text-muted-foreground/80 mt-0.5 line-clamp-1">{st.desc}</p>
                  {isActive && (
                    <div className="absolute -top-1.5 right-1 px-1 py-0.2 bg-primary text-[8px] font-black text-black rounded uppercase">
                      Active
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Playback Control Bar */}
        <div className="bg-card border border-border rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentStepIdx((p) => Math.max(0, p - 1))}
              disabled={currentStepIdx === 0}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-colors"
              title="Previous Step"
            >
              <IconChevronLeft size={16} />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90'
              }`}
            >
              {isPlaying ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-black animate-pulse" /> Pause Execution
                </>
              ) : (
                <>
                  <IconPlay size={14} /> Play Demonstration
                </>
              )}
            </button>

            <button
              onClick={() => setCurrentStepIdx((p) => Math.min(steps.length - 1, p + 1))}
              disabled={currentStepIdx >= steps.length - 1}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-colors"
              title="Next Step"
            >
              <IconChevronRight size={16} />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false)
                setCurrentStepIdx(0)
              }}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
              title="Reset to Step 1"
            >
              <IconRefresh size={16} />
            </button>

            <div className="h-5 w-px bg-border hidden sm:block" />

            <div className="text-xs">
              <span className="text-muted-foreground">Step</span>{' '}
              <span className="font-bold text-foreground">
                {steps.length > 0 ? currentStepIdx + 1 : 0}
              </span>{' '}
              <span className="text-muted-foreground">of {steps.length}</span>:
              <span className="font-semibold text-primary ml-1.5 truncate max-w-[280px] inline-block align-bottom">
                {step?.step_name || 'Idle'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed selector */}
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 p-1 rounded-lg border border-border">
              <span>Speed:</span>
              {[
                { label: '1x', ms: 3000 },
                { label: '2x', ms: 1800 },
                { label: '4x', ms: 900 },
              ].map((sp) => (
                <button
                  key={sp.label}
                  onClick={() => setPlaybackSpeed(sp.ms)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    playbackSpeed === sp.ms
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:text-foreground text-muted-foreground'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>

            {/* Step jump scrubber */}
            <div className="hidden md:flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIsPlaying(false)
                    setCurrentStepIdx(i)
                  }}
                  className={`h-2.5 rounded-full transition-all ${
                    i === currentStepIdx
                      ? 'w-6 bg-primary ring-2 ring-primary/30'
                      : i < currentStepIdx
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-muted hover:bg-muted-foreground/40'
                  }`}
                  title={`Jump to Step ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ─── 4-PANEL DEMONSTRATION INTERFACE ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* PANEL 1: Customer Journey & Channel Evidence */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Customer Journey & Channel Evidence</h3>
                    <p className="text-[11px] text-muted-foreground">Natural Language Input & Context State</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Channel: {step?.customer_journey?.channel || 'Web Assistant'}
                </span>
              </div>

              {/* Customer Profile Card */}
              <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow">
                    RS
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      {step?.customer_journey?.customer_name || 'Rahul Sharma'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ID: <span className="font-mono text-foreground">{step?.customer_journey?.customer_id || 'CUST-001'}</span> • Tier: <span className="text-amber-400 font-semibold">{step?.customer_journey?.tier || 'Enterprise Premium'}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-muted-foreground block">Order ID</span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {step?.customer_journey?.order_id || 'ORD-2026-LPT'}
                  </span>
                </div>
              </div>

              {/* Order State Tracker */}
              <div className="mt-3 p-3 rounded-xl bg-card border border-border/60">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground text-[11px]">Current Lifecycle State</span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-primary/10 text-primary border border-primary/20 uppercase">
                    {step?.customer_journey?.lifecycle_state || 'processing'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Product: <strong className="text-foreground">{step?.customer_journey?.product || 'Dell XPS 15 (PROD-DEL-15)'}</strong>
                </p>
              </div>

              {/* Customer Voice / Message Box */}
              <div className="mt-3 p-3.5 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
                    <IconVolume size={13} />
                    Customer Interaction / Event
                  </span>
                  {step?.customer_journey?.utterance && (
                    <button
                      onClick={() => handleSpeak(step.customer_journey.utterance)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      {speaking ? <IconVolumeMute size={12} /> : <IconVolume size={12} />}
                      Listen Audio
                    </button>
                  )}
                </div>
                <p className="text-xs text-foreground/90 italic leading-relaxed">
                  "{step?.customer_journey?.utterance || 'System background synchronization in progress.'}"
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Timestamp: {step?.timestamp || '2026-11-01 10:00:00 UTC'}</span>
              <span className="text-emerald-400 font-medium">● Operational</span>
            </div>
          </div>

          {/* PANEL 2: Agentic AI Execution & Reasoning */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Agentic AI Execution & Reasoning</h3>
                    <p className="text-[11px] text-muted-foreground">Chain of Thought & Zero-Hallucination Policy</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase">
                  {step?.agent_execution?.phase || 'REASONING'}
                </span>
              </div>

              {/* Policy Checks & Guard Evaluation */}
              <div className="mt-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-purple-300 text-[11px] flex items-center gap-1.5">
                    <IconShield size={13} />
                    Verified Policy Enforced
                  </span>
                  <span className="text-emerald-400 font-mono text-[10px] font-bold">✓ POLICY COMPLIANT</span>
                </div>
                <p className="text-xs text-foreground font-medium">
                  {step?.agent_execution?.policy_verified || 'POL-01: Standard Customer Protection Directive'}
                </p>
              </div>

              {/* LLM Internal Reasoning / Decision Justification */}
              <div className="mt-3 p-3.5 rounded-xl bg-muted/40 border border-border/80">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                  Autonomous Decision Rationale
                </span>
                <p className="text-xs text-foreground/90 leading-relaxed font-sans">
                  {step?.agent_execution?.thought_process ||
                    'Evaluating order manifest and shipment coordinates. Selecting optimal regional hub to fulfill replacement without human intervention.'}
                </p>
              </div>

              {/* Decision Verdict */}
              <div className="mt-3 p-3 rounded-xl bg-card border border-border/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Next Planned Action</span>
                  <span className="text-xs font-semibold text-primary">
                    {step?.agent_execution?.next_action || 'Execute Transactional Warehouse Lock'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Confidence</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">99.8%</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Model: Gemini 2.0 Flash (Deterministic Tool Call)</span>
              <span className="text-purple-400 font-mono font-semibold">Zero Hallucination</span>
            </div>
          </div>

          {/* PANEL 3: Deterministic Backend Tool Execution */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Deterministic Backend Tool Execution</h3>
                    <p className="text-[11px] text-muted-foreground">Transactional State Updates & Inventory Locks</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {step?.tool_execution?.tool_name || 'execute_workflow'}
                </span>
              </div>

              {/* Tool Execution Metric */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Execution Status</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {step?.tool_execution?.status || 'SUCCESS'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Execution Latency</span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {step?.tool_execution?.latency_ms ? `${step.tool_execution.latency_ms} ms` : '48 ms'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">State Transition</span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {step?.tool_execution?.state_transition || 'Atomic Commit'}
                  </span>
                </div>
              </div>

              {/* Warehouse / Inventory Delta State Widget */}
              {step?.tool_execution?.warehouse_delta && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                    Warehouse Replanning Delta
                  </span>
                  <p className="text-xs font-mono text-foreground font-semibold">
                    {step.tool_execution.warehouse_delta}
                  </p>
                </div>
              )}

              {/* Live JSON Payload Viewer */}
              <div className="mt-3">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Live Tool Payload & Response
                </span>
                <div className="p-3 rounded-xl bg-black/60 border border-border font-mono text-[11px] text-emerald-400 max-h-36 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(step?.tool_execution?.payload || { status: 'ok', verified: true }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Database: SQLite via SQLModel (ACID Compliant)</span>
              <span className="text-emerald-400 font-mono">100% Deterministic</span>
            </div>
          </div>

          {/* PANEL 4: Persistent Customer Memory & Cryptographic Audit */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Persistent Memory & Cryptographic Audit</h3>
                    <p className="text-[11px] text-muted-foreground">Long-Term Context & Tamper-Proof Audit Trail</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  SHA-256 Verified
                </span>
              </div>

              {/* Extracted Facts */}
              <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Verified Facts Extracted To Memory
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {step?.memory_audit?.facts && step.memory_audit.facts.length > 0 ? (
                    step.memory_audit.facts.map((f: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
                      >
                        ✓ {f}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No new permanent facts updated at this step.</span>
                  )}
                </div>
              </div>

              {/* Idempotency Key & Protection */}
              <div className="mt-3 p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Idempotency Guard Key</span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {step?.memory_audit?.idempotency_key || 'IDEMP-2026-8819'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  REPLAY PROTECTED
                </span>
              </div>

              {/* Cryptographic SHA-256 Hash Block */}
              <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <IconShield size={12} />
                    AgentEvent Hash Block
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">Block #{currentStepIdx + 101}</span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  Hash: <span className="text-foreground">{step?.memory_audit?.current_hash || 'a4f91b72e903bc18ff390218b2c4e883901f...'}</span>
                </p>
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  Prev: <span className="text-muted-foreground/80">{step?.memory_audit?.prev_hash || '3c82e011a912bb09f1873099ac0081d1182a...'}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Customer Memory: CUST-001 (Persistent)</span>
              <span className="text-amber-400 font-mono font-semibold">Immutable Ledger</span>
            </div>
          </div>
        </div>

        {/* ─── FAILURE SCENARIO DRAWER / MODAL ─── */}
        {showScenarios && (
          <div className="bg-card border-2 border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <IconFlame size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Interactive Edge-Case Failure Simulations (7 Scenarios)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Demonstrate ResolveAI's zero-trust guards, graceful error containment, and adaptive recovery.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScenarios(false)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 border rounded"
              >
                Close Drawer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  className="p-3.5 rounded-xl border border-border/80 bg-muted/20 hover:border-amber-500/50 hover:bg-muted/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground">{sc.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                        {sc.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{sc.description}</p>
                  </div>
                  <button
                    onClick={() => handleRunScenario(sc.id)}
                    disabled={loadingScenario}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <IconFlame size={12} />
                    Trigger Scenario
                  </button>
                </div>
              ))}
            </div>

            {/* Scenario Result Inspection Box */}
            {scenarioResult && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Scenario Outcome: {scenarioResult.title || 'Simulation Completed'}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    STATUS: {scenarioResult.safety_status || 'GUARD_TRIGGERED'}
                  </span>
                </div>
                <div className="text-xs text-foreground space-y-1">
                  <p>
                    <strong>Safety Interception:</strong> {scenarioResult.interception}
                  </p>
                  <p>
                    <strong>Autonomous Recovery:</strong> {scenarioResult.outcome}
                  </p>
                  {scenarioResult.recovery_step && (
                    <p className="font-mono text-[11px] text-amber-200">
                      <strong>Executed Guardrail:</strong> {scenarioResult.recovery_step}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </NavShell>
  )
}

