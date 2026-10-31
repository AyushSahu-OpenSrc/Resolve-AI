'use client'

/**
 * ResolveAI — Autonomous Customer Resolution Agent
 * Landing & Operations Showcase
 *
 * Implements the PQC-LAB aesthetic:
 * - 3 interactive generated banner scenes (Investigation, Policy Engine, Settlements)
 * - Glassmorphism view-controller capsule switcher
 * - Interactive hotspot CTAs mapped to real routes (/cases/new, /cases, /policies, /inventory)
 * - Authentic database-backed state with zero mock figures
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  IconCheck as Check,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconDashboard as LayoutDashboard,
  IconMenu as Menu,
  IconClose as X,
  IconMic as Mic,
  IconDatabase as Database,
  IconShield as Shield,
  IconTruck as Truck,
  IconFileText as FileText,
  IconFlame as Flame,
  IconSpark as Spark,
  IconUsers as Users,
  IconBox as BoxIcon,
  IconAlert as AlertIcon,
  IconClock as Clock,
} from '@/components/icons'
import { useUser } from '@clerk/nextjs'
import './qfit-home.css'
import { DiagramModal, type DiagramType } from '@/components/DiagramModal'

/* ─────────────────────────────────────────────────────────────────────────────
   ROUTES & NAVIGATION
   ───────────────────────────────────────────────────────────────────────────── */
const ROUTES = {
  liveDemo: '/live-demo',
  
  customerMemory: '/customer-memory',
  orderLifecycle: '/order-lifecycle',
  proactive: '/proactive-intelligence',
  cases: '/cases',
  newCase: '/cases/new',
  policies: '/policies',
  inventory: '/inventory',
  runs: '/agent-runs',
  explorer: '/explorer',
  imports: '/imports',
  signin: '/sign-in',
  signup: '/sign-up',
} as const

const NAV_LINKS = [
  { label: 'Live Demo', href: '/live-demo' },
  { label: 'Cases', href: ROUTES.cases },
  { label: 'Memory', href: ROUTES.customerMemory },
  { label: 'Lifecycle', href: ROUTES.orderLifecycle },
  { label: 'Proactive', href: ROUTES.proactive },
  { label: 'Inventory', href: ROUTES.inventory },
  { label: 'Policies', href: ROUTES.policies },
] as const

/* ─────────────────────────────────────────────────────────────────────────────
   HERO SCENES — 3 banners generated specifically for ResolveAI
   hotspot boxes are [x0, y0, x1, y1] in banner pixel space (2103 × 748)
   ───────────────────────────────────────────────────────────────────────────── */
const BANNER_W = 2103
const BANNER_H = 748

type Box = [number, number, number, number]
type Cta = { label: string; to: string; kind: 'primary' | 'ghost' }
type Scene = {
  id: string
  label: string
  tone: 'dark' | 'light'
  base: string
  fill: string
  mobilePos: string
  alt: string
  title: string
  body: string
  ctas: Cta[]
  hotspots: { label: string; to: string; box: Box }[]
}

const SCENES: Scene[] = [
  {
    id: 'investigation',
    label: 'Investigation',
    tone: 'dark',
    base: '/assets/banners/hero-overview',
    fill: '#051124',
    mobilePos: '93% 50%',
    alt: 'Autonomous Case Investigation and Voice Dictation Ingestion. Real-time carrier tracking and order manifest verification.',
    title: 'Resolve Customer Conflicts. Pure Evidence. Zero Hallucination.',
    body: 'ResolveAI is an autonomous customer resolution agent that ingests disputes via Speech Recognition Mic, chat, or CSV uploads. It inspects order manifests, cross-references warranty policies, and coordinates multi-warehouse inventory without fabricated data.',
    ctas: [
      { label: 'Launch Dashboard ↗', to: ROUTES.cases, kind: 'primary' },
      { label: 'Record via Mic', to: ROUTES.newCase, kind: 'ghost' },
    ],
    hotspots: [
      { label: 'Launch Resolution Dashboard', to: ROUTES.cases, box: [90, 440, 410, 506] },
      { label: 'Record via Mic', to: ROUTES.newCase, box: [430, 440, 730, 506] },
      { label: 'Inspect Case 1042', to: ROUTES.cases, box: [1080, 90, 2010, 650] },
    ],
  },
  {
    id: 'policies',
    label: 'Policy Engine',
    tone: 'dark',
    base: '/assets/banners/hero-devices',
    fill: '#0c2749',
    mobilePos: '86% 50%',
    alt: 'Deterministic Policy Engine and Multi-Hub Regional Inventory Allocation.',
    title: 'Deterministic Policy Engine. Zero-Hallucination Inventory.',
    body: 'No blind promises or fake refunds. ResolveAI evaluates strict warranty eligibility, damage evidence, and live multi-warehouse stocks (Mumbai, Pune, Bangalore) before committing any replacement or settlement.',
    ctas: [
      { label: 'Inspect Policy Rules ↗', to: ROUTES.policies, kind: 'primary' },
      { label: 'Inspect Warehouses', to: ROUTES.inventory, kind: 'ghost' },
    ],
    hotspots: [
      { label: 'Inspect Policy Rules', to: ROUTES.policies, box: [90, 440, 400, 506] },
      { label: 'Inspect Warehouses', to: ROUTES.inventory, box: [420, 440, 720, 506] },
      { label: 'Pune Hub Optimal Match', to: ROUTES.inventory, box: [1410, 360, 1680, 620] },
    ],
  },
  {
    id: 'settlements',
    label: 'Settlements',
    tone: 'dark',
    base: '/assets/banners/hero-workflow',
    fill: '#06122b',
    mobilePos: '96% 50%',
    alt: 'End-to-End Closed Loop Settlements and Cryptographic Audit Ledger.',
    title: 'End-to-End Resolution. Zero Manual Overhead.',
    body: 'From customer dispute to confirmed warehouse stock allocation and customer email dispatch, every single agent tool invocation is logged into an immutable database audit trail.',
    ctas: [
      { label: 'Inspect Agent Runs ↗', to: ROUTES.runs, kind: 'primary' },
      { label: 'Audit Case Explorer', to: ROUTES.explorer, kind: 'ghost' },
    ],
    hotspots: [
      { label: 'Inspect Agent Runs', to: ROUTES.runs, box: [90, 440, 400, 506] },
      { label: 'Audit Case Explorer', to: ROUTES.explorer, box: [420, 440, 720, 506] },
      { label: 'Execution Pipeline', to: ROUTES.runs, box: [1080, 90, 2010, 650] },
    ],
  },
]

/* ─────────────────────────────────────────────────────────────────────────────
   OPERATIONAL PILLARS
   ───────────────────────────────────────────────────────────────────────────── */
const STANDARDS = [
  { name: 'Pure Evidence', note: 'Ground in order manifests' },
  { name: 'Deterministic Policy', note: 'Zero hallucinated promises' },
  { name: 'Multi-Hub Inventory', note: 'Mumbai & Pune live allocation' },
  { name: 'Two-Tier Failover', note: 'Gemini 2.0 + Groq GPT-OSS 120B' },
  { name: 'Closed-Loop Audit', note: 'Immutable DB execution trace' },
]

/* ─────────────────────────────────────────────────────────────────────────────
   5-STAGE PIPELINE STEPPER
   ───────────────────────────────────────────────────────────────────────────── */
const PIPELINE = [
  {
    icon: Mic,
    label: 'Voice Ingestion',
    desc: 'Customer dispute captured via browser SpeechRecognition mic, chat, or CSV batch upload.',
    out: 'A structured SupportCase record with customer message and order link.',
  },
  {
    icon: Database,
    label: 'Evidence Intake',
    desc: 'Agent gathers order history, delivery confirmation, customer tier, and tracking evidence.',
    out: 'Verified order and shipment status: Delivered 2 days ago via carrier.',
  },
  {
    icon: Shield,
    label: 'Policy Governance',
    desc: 'Enforces business rules: 7-day reporting limit, damage verification, SKU eligibility.',
    out: 'A deterministic verdict: Replacement approved under POL-WARRANTY-01.',
  },
  {
    icon: Truck,
    label: 'Multi-Hub Routing',
    desc: 'Checks regional stock: Mumbai Hub is out of stock (0), redirects to Pune Hub (2 units).',
    out: '1 unit reserved at Pune Hub. Database row locked to prevent race conditions.',
  },
  {
    icon: FileText,
    label: 'Closed-Loop Execution',
    desc: 'Generates replacement order REP-1042-PUNE, decrements Pune stock, and drafts customer email.',
    out: 'Immutable audit log stored in agent_events table. Resolution verified.',
  },
]

/* ─────────────────────────────────────────────────────────────────────────────
   SMART LINK HELPER
   ───────────────────────────────────────────────────────────────────────────── */
function SmartLink({
  to,
  children,
  className,
  'aria-label': ariaLabel,
  style,
  onClick,
}: {
  to: string
  children?: React.ReactNode
  className?: string
  'aria-label'?: string
  style?: CSSProperties
  onClick?: () => void
}) {
  if (to.startsWith('#')) {
    return (
      <a href={to} className={className} aria-label={ariaLabel} style={style} onClick={onClick}>
        {children}
      </a>
    )
  }
  return (
    <Link href={to} className={className} aria-label={ariaLabel} style={style} onClick={onClick}>
      {children}
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   BRAND COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */
function Brand() {
  return (
    <Link href="/" className="qf-brand" aria-label="ResolveAI — Home">
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}>
        <Image src="/logo.png" alt="ResolveAI Mascot" width={36} height={36} style={{ objectFit: 'contain' }} priority />
      </div>
      <span className="qf-brand__word">
        Resolve<span className="qf-brand__lab">AI</span>
      </span>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   FLOATING NAV
   ───────────────────────────────────────────────────────────────────────────── */
function Nav({ overLight }: { overLight: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState<string | null>(null)
  const calm = useReducedMotion()
  const { isLoaded, isSignedIn } = useUser()

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="qf-nav" data-scrolled={scrolled} data-over-light={overLight}>
      <motion.div
        className="qf-nav__wrap"
        initial={calm ? false : { y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        <div className="qf-nav__pill">
          <Brand />

          <nav className="qf-nav__links" aria-label="Primary" onPointerLeave={() => setHover(null)}>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="qf-nav__link"
                onPointerEnter={() => setHover(l.href)}
                onFocus={() => setHover(l.href)}
                onBlur={() => setHover(null)}
              >
                {hover === l.href && (
                  <motion.span
                    layoutId="qf-nav-hover"
                    className="qf-nav__hover"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="qf-nav__label">{l.label}</span>
              </Link>
            ))}
          </nav>

          <div className="qf-nav__auth">
            {isLoaded && isSignedIn ? (
              <Link href="/dashboard" className="qf-btn qf-btn--primary">
                <LayoutDashboard size={15} /> Dashboard
              </Link>
            ) : (
              <>
                <Link href={ROUTES.signin} className="qf-btn qf-btn--quiet qf-nav__login">
                  Sign in
                </Link>
                <Link href={ROUTES.signup} className="qf-btn qf-btn--primary">
                  Sign up
                </Link>
              </>
            )}
            <button
              type="button"
              className="qf-nav__burger"
              aria-expanded={open}
              aria-controls="qf-sheet"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              id="qf-sheet"
              className="qf-sheet"
              initial={calm ? false : { opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <nav aria-label="Mobile">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="qf-sheet__link"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                    <ChevronRight size={18} />
                  </Link>
                ))}
              </nav>
              <div className="qf-sheet__auth">
                <Link href={ROUTES.signin} className="qf-btn qf-btn--ghost qf-btn--lg" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link href={ROUTES.signup} className="qf-btn qf-btn--primary qf-btn--lg" onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   HERO SECTION — with Glass View Controller
   ───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   INVESTIGATION TELEMETRY CARD (Vector glassmorphism HUD without overlapping)
   ───────────────────────────────────────────────────────────────────────────── */
function InvestigationTelemetryCard() {
  return (
    <Link href="/cases" className="qf-telemetry-card" aria-label="Inspect Case CASE-1042 Resolution Audit">
      {/* Header */}
      <div className="qf-telemetry-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '6px',
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
          }}>
            CASE-1042
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600, letterSpacing: '0.04em' }}>
            VERIFIED RESOLUTION AUDIT
          </span>
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.35)',
          color: '#4ade80',
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 700,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
          ACTIVE RUN
        </div>
      </div>

      {/* Subcard 1: Customer Identity & Record */}
      <div className="qf-telemetry-subcard">
        <span className="qf-telemetry-label">Customer Identity & Record</span>
        <strong style={{ fontSize: '14.5px', color: '#fff', margin: 0 }}>Rahul Sharma</strong>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          ID: CUST-001 · Tier: Enterprise Premium · LTV: ₹34,900
        </span>
      </div>

      {/* Subcard 2: Order & Shipment Evidence */}
      <div className="qf-telemetry-subcard">
        <span className="qf-telemetry-label">Order & Shipment Evidence</span>
        <strong style={{ fontSize: '13px', color: '#fff', margin: 0 }}>
          Order: ORD-1042 · Headphones (PROD-HP01)
        </strong>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          Tracking: Bluedart BD-90412 · Delivered 2 days ago · Crushed Box
        </span>
      </div>

      {/* Subcard 3: Speech Recognition (Mic Dictation) */}
      <div className="qf-telemetry-subcard">
        <span className="qf-telemetry-label">Speech Recognition (Mic Dictation)</span>
        <p style={{ margin: '2px 0', fontSize: '12px', color: '#f1f5f9', fontStyle: 'italic' }}>
          &ldquo;My order arrived damaged with cracked frame.&rdquo;
        </p>
        <div className="qf-waveform-bars" aria-hidden="true">
          {[8, 14, 6, 18, 11, 20, 8, 13, 17, 10, 18, 13, 7, 11, 16, 9].map((h, idx) => (
            <span
              key={idx}
              className="qf-waveform-bar"
              style={{
                height: `${h}px`,
                animationDelay: `${idx * 0.08}s`,
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '10.5px', color: '#38bdf8', fontFamily: 'var(--mono)' }}>
          Signal: 44.1 kHz PCM · Transcription Confidence: 99.4%
        </span>
      </div>

      {/* Subcard 4: Autonomous Verdict & Action Dispatch */}
      <div className="qf-telemetry-subcard" style={{ borderLeft: '3px solid #34d399' }}>
        <span className="qf-telemetry-label" style={{ color: '#4ade80' }}>Autonomous Verdict & Action Dispatch</span>
        <strong style={{ fontSize: '12.5px', color: '#fff', margin: 0 }}>
          Policy Verified: Replacement Permitted (POL-01)
        </strong>
        <span style={{ fontSize: '11px', color: '#86efac' }}>
          Allocated Stock: Pune Hub (2 units) · Order REP-1042 · Dispatched
        </span>
      </div>
    </Link>
  )
}

function Hero({
  active,
  leaving,
  onSelect,
}: {
  active: number
  leaving: number | null
  onSelect: (i: number) => void
}) {
  const scene = SCENES[active]
  const ctrlRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [focus, setFocus] = useState<number | null>(null)

  const cols = SCENES.length + 1
  const idx = hover ?? focus ?? active + 1
  const edge = idx === 0 || idx === cols - 1 ? ' + 5px' : ''
  const capStyle = {
    '--cap-left': idx === 0 ? '-5px' : `${(idx * 100) / cols}%`,
    '--cap-width': `calc(${100 / cols}%${edge})`,
  } as CSSProperties

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ctrlRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--glass-x', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
    el.style.setProperty('--glass-y', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
  }

  const stateOf = (i: number) => (i === active ? 'active' : i === leaving ? 'leaving' : 'idle')

  return (
    <section
      className="qf-hero"
      data-tone={scene.tone}
      aria-label="ResolveAI"
      style={{ '--qf-fill': scene.fill } as CSSProperties}
    >
      {/* Top Edge Extension Strip */}
      <div className="qf-hero__top" aria-hidden="true">
        {SCENES.map((s, i) => (
          <div
            key={s.id}
            className="qf-edge"
            data-state={stateOf(i)}
            style={{ backgroundImage: `url(${s.base}-edge-top.png)` }}
          />
        ))}
      </div>

      {/* Main Banner Scene */}
      <div className="qf-banner">
        {SCENES.map((s, i) => (
          <div
            key={s.id}
            className="qf-scene"
            data-state={stateOf(i)}
            style={{ '--pos': s.mobilePos } as CSSProperties}
          >
            {/* Banner Artwork */}
            <picture>
              <source srcSet={`${s.base}.webp`} type="image/webp" />
              <img
                src={`${s.base}.webp`}
                alt={s.alt}
                width={BANNER_W}
                height={BANNER_H}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                draggable={false}
              />
            </picture>

            {/* High-Resolution Vector Telemetry Card (Zero Text Overlapping) */}
            {s.id === 'investigation' && (
              <div className="qf-telemetry-overlay">
                <InvestigationTelemetryCard />
              </div>
            )}

            {/* Clickable Hotspots overlaying buttons drawn on the banner */}
            {s.hotspots.map((h) => (
              <SmartLink
                key={h.label}
                to={h.to}
                className="qf-hot"
                aria-label={h.label}
                style={{
                  left: `${(h.box[0] / BANNER_W) * 100}%`,
                  top: `${(h.box[1] / BANNER_H) * 100}%`,
                  width: `${((h.box[2] - h.box[0]) / BANNER_W) * 100}%`,
                  height: `${((h.box[3] - h.box[1]) / BANNER_H) * 100}%`,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Bottom Edge Extension Strip + Controller */}
      <div className="qf-hero__bottom">
        {SCENES.map((s, i) => (
          <div
            key={s.id}
            className="qf-edge"
            aria-hidden="true"
            data-state={stateOf(i)}
            style={{ backgroundImage: `url(${s.base}-edge-bottom.png)` }}
          />
        ))}

        <div className="qf-hero__inner">
          {/* Glass View Controller */}
          <div
            ref={ctrlRef}
            className="qf-controller"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <div className="qf-glass qf-track" />
            <div className="qf-glass qf-capsule" style={capStyle} />
            <div className="qf-cells">
              <span className="qf-cell qf-cell--label" data-dim={hover !== null || focus !== null}>
                Switch view
              </span>
              {SCENES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className="qf-cell qf-cell--btn"
                  aria-pressed={i === active}
                  onPointerEnter={() => setHover(i + 1)}
                  onFocus={() => setFocus(i + 1)}
                  onBlur={() => setFocus(null)}
                  onClick={() => onSelect(i)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <p className="qf-hero__note">
            Authentic database state · Ingest disputes via Speech Recognition Mic, Chat or CSV · Multi-warehouse stock allocation
          </p>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   INTERACTIVE 5-STEP PIPELINE
   ───────────────────────────────────────────────────────────────────────────── */
function PipelineSection() {
  const [step, setStep] = useState(0)
  const current = PIPELINE[step]
  const Icon = current.icon

  return (
    <section className="qf-block qf-block--white" id="pipeline">
      <div className="qf-wrap">
        <div className="qf-head">
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2f5bff', margin: '0 0 10px' }}>
            Autonomous Architecture
          </p>
          <h2 className="qf-h2">From customer complaint to confirmed settlement.</h2>
          <p className="qf-lede">
            ResolveAI eliminates human delays and manual ticket ping-pong. Every stage runs deterministically against your live SQLite database.
          </p>
        </div>

        <div className="qf-steps">
          <div className="qf-steps__list" style={{ '--p': step / (PIPELINE.length - 1) } as CSSProperties}>
            {PIPELINE.map((item, i) => (
              <button
                key={item.label}
                type="button"
                className="qf-steps__item"
                data-done={i < step}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => setStep(i)}
              >
                <span className="qf-steps__n">{i < step ? <Check size={14} /> : i + 1}</span>
                <span className="qf-steps__label">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="qf-steps__panel">
            <div className="qf-steps__content">
              <div className="qf-steps__icon">
                <Icon size={32} color="#27c4f5" />
              </div>
              <span className="qf-steps__count">Stage {step + 1} of 5</span>
              <h3 className="qf-steps__title">{current.label}</h3>
              <p className="qf-steps__desc">{current.desc}</p>
              <div className="qf-steps__out">
                <span>Output verification</span>
                <strong>{current.out}</strong>
              </div>
            </div>

            <div className="qf-steps__nav">
              <button
                type="button"
                className="qf-round"
                disabled={step === 0}
                aria-label="Previous step"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="qf-round"
                disabled={step === PIPELINE.length - 1}
                aria-label="Next step"
                onClick={() => setStep((s) => Math.min(PIPELINE.length - 1, s + 1))}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   3-CARD FEATURE GALLERY (Using the 3 generated banners)
   ───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   EXPLORE RESOLVEAI 2.0 CAPABILITIES (7 Pillar Cards)
   ───────────────────────────────────────────────────────────────────────────── */
function CapabilitiesSection() {
  const capabilities = [
    {
      tag: 'AGENTIC WORKFLOW',
      title: 'Unified Autonomous AI Agent',
      desc: 'Bounded 10-step loop: Understand → Context → Observe → Plan → Authorize → Execute → Evaluate → Adapt → Verify → Persist.',
      link: '/live-demo',
      linkText: 'Explore agentic loop ↗',
      color: '#38bdf8',
    },
    {
      tag: 'LONGITUDINAL MEMORY',
      title: 'Persistent Customer Memory',
      desc: 'Remembers cross-session customer facts, delivery preferences, and defers feedback politely when deliveries are disrupted.',
      link: ROUTES.customerMemory,
      linkText: 'Inspect customer memory ↗',
      color: '#c084fc',
    },
    {
      tag: 'DETERMINISTIC MACHINE',
      title: 'End-to-End Order Lifecycle',
      desc: 'Deterministic state transitions from order placement through fulfillment, exception handling, and post-delivery resolution.',
      link: ROUTES.orderLifecycle,
      linkText: 'Track lifecycle journeys ↗',
      color: '#34d399',
    },
    {
      tag: 'FLEET MONITORING',
      title: 'Proactive Operational Intelligence',
      desc: 'Detects courier weather bottlenecks, stalled transit checkpoints, and pre-empts complaints before customers call in.',
      link: ROUTES.proactive,
      linkText: 'View proactive alerts ↗',
      color: '#fbbf24',
    },
    {
      tag: 'MULTI-HUB LOGISTICS',
      title: 'Autonomous Stock Replanning',
      desc: 'Dynamically discovers regional hub inventory (Mumbai stockout → Pune Hub allocation) with atomic SQLite reservation.',
      link: ROUTES.inventory,
      linkText: 'Inspect live inventory ↗',
      color: '#60a5fa',
    },
    {
      tag: 'ZERO TRUST SECURITY',
      title: 'Zero Trust Gateway & RBAC',
      desc: 'Customer data boundary checks, prompt injection sanitization, idempotency protection, and supervisor approval gateway.',
      link: '/live-demo',
      linkText: 'Inspect security guards ↗',
      color: '#f87171',
    },
    {
      tag: 'HACKATHON DEMO',
      title: '14-Stage Lifecycle Simulator',
      desc: 'Step-by-step playback of complete laptop lifecycle with neural voice narration and real-time database state inspection.',
      link: '/live-demo',
      linkText: 'Launch 14-stage simulator ↗',
      color: '#f97316',
    },
  ]

  return (
    <section className="qf-block qf-block--night" id="capabilities">
      <div className="qf-wrap">
        <div className="qf-head">
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#38bdf8', margin: '0 0 10px' }}>
            System Capabilities
          </p>
          <h2 className="qf-h2">Explore ResolveAI 2.0 Capabilities</h2>
          <p className="qf-lede">
            Seven unified pillars of autonomous customer lifecycle intelligence, persistent memory, and verified resolutions.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {capabilities.map((cap, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: cap.color,
                    background: `${cap.color}15`,
                    border: `1px solid ${cap.color}35`,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    display: 'inline-block',
                    marginBottom: '12px',
                  }}
                >
                  {cap.tag}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
                  {cap.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6, margin: 0 }}>
                  {cap.desc}
                </p>
              </div>

              <Link
                href={cap.link}
                style={{
                  marginTop: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: cap.color,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {cap.linkText}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SEE RESOLVEAI IN ACTION (Demo Mode A & Demo Mode B Previews)
   ───────────────────────────────────────────────────────────────────────────── */
function SeeInActionSection() {
  return (
    <section className="qf-block qf-block--white" id="see-in-action">
      <div className="qf-wrap">
        <div className="qf-head">
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2563eb', margin: '0 0 10px' }}>
            Live Demonstrations
          </p>
          <h2 className="qf-h2">See ResolveAI in Action</h2>
          <p className="qf-lede">
            Two comprehensive live demonstration environments engineered for Tech Zephyr 4.0 evaluation.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          {/* Demo A: Inventory Conflict */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    padding: '4px 10px',
                    borderRadius: '8px',
                  }}
                >
                  DEMO MODE A: CONFLICT & REPLAN
                </span>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>
                  ORDER: ORD-1042
                </span>
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
                Autonomous Replacement & Multi-Hub Replanning
              </h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
                Customer reports damaged wireless headphones. Mumbai Regional Hub is depleted (0 units). ResolveAI evaluates damage evidence, executes Policy POL-01, dynamically discovers 2 available units at Pune Hub, and creates an atomic replacement order.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong> Speech Recognition Voice Ingestion:</strong> Real-time microphone audio transcription
                </div>
                <div style={{ fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong> Deterministic Policy Enforcement:</strong> Zero hallucinations or fake promises
                </div>
                <div style={{ fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong> Multi-Hub Stock Routing:</strong> Automatic failover to secondary Pune warehouse
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <Link
                href="/live-demo"
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                }}
              >
                Explore Agentic Workflow ↗
              </Link>
              <Link
                href="/cases"
                style={{
                  background: '#fff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                }}
              >
                Inspect Case 1042
              </Link>
            </div>
          </div>

          {/* Demo B: Complete Lifecycle */}
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '24px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#fff',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                  }}
                >
                  DEMO MODE B: COMPLETE LIFECYCLE
                </span>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#94a3b8' }}>
                  ORDER: ORD-2026-LPT
                </span>
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
                End-to-End Laptop Customer Lifecycle
              </h3>
              <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px' }}>
                Follow customer Rahul Sharma from order placement through logistics transit, proactive courier weather delay detection, broken laptop screen intake, Chutku contextual memory chat, replacement dispatch, and polite CSAT deferral.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong> Proactive Disruption Detection:</strong> Alerts customer before they file ticket
                </div>
                <div style={{ fontSize: '12px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong> Persistent Memory Engine:</strong> Preserves customer delivery preferences & facts
                </div>
                <div style={{ fontSize: '12px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong> Polite Feedback Protection:</strong> Defers reviews while issue is active
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <Link
                href="/live-demo"
                style={{
                  background: '#38bdf8',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '13px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                }}
              >
                Try Live Demo ↗
              </Link>
              <Link
                href="/order-lifecycle"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                }}
              >
                View Customer Lifecycle
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureGallery({ onOpenDiagram }: { onOpenDiagram: (type: DiagramType) => void }) {
  return (
    <section className="qf-block qf-block--night" id="features">
      <div className="qf-wrap">
        <div className="qf-head">
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#818cf8', margin: '0 0 10px' }}>
            System Pillars
          </p>
          <h2 className="qf-h2">Engineered for absolute accuracy.</h2>
          <p className="qf-lede">
            Explore the three subsystems that keep customer resolutions completely accurate, policy-compliant, and grounded in real inventory.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {/* Card 1: Investigation & Voice Mic */}
          <div style={{
            background: 'rgb(255 255 255 / 0.04)',
            border: '1px solid rgb(255 255 255 / 0.12)',
            borderRadius: '24px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ position: 'relative', width: '100%', height: '200px', background: '#051124' }}>
              <img
                src="/assets/banners/card-intake.webp"
                alt="Autonomous Investigation Banner"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="qf-tag qf-tag--published">SPEECH RECOGNITION</span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>Voice Mic & CSV Intake</h3>
              <p style={{ fontSize: '14px', color: 'rgb(255 255 255 / 0.7)', lineHeight: 1.6, margin: 0 }}>
                Speak directly into the browser mic or upload dispute CSVs. Audio is transcribed in real-time and matched with tracking records.
              </p>
              <Link href={ROUTES.newCase} className="qf-link" style={{ marginTop: 'auto', paddingTop: '12px', color: '#38bdf8' }}>
                Test voice intake ↗
              </Link>
            </div>
          </div>

          {/* Card 2: Multi-Hub Inventory */}
          <div style={{
            background: 'rgb(255 255 255 / 0.04)',
            border: '1px solid rgb(255 255 255 / 0.12)',
            borderRadius: '24px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ position: 'relative', width: '100%', height: '200px', background: '#0c2749' }}>
              <img
                src="/assets/banners/card-routing.webp"
                alt="Multi-Hub Inventory Banner"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="qf-tag qf-tag--host-test">REGIONAL LOGISTICS</span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>Multi-Hub Stock Allocation</h3>
              <p style={{ fontSize: '14px', color: 'rgb(255 255 255 / 0.7)', lineHeight: 1.6, margin: 0 }}>
                When Mumbai Hub is depleted (0 units), the agent automatically reroutes to Pune Hub (2 units) without stalling customer fulfillment.
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href={ROUTES.inventory} className="qf-link" style={{ color: '#818cf8' }}>
                  Inspect live inventory ↗
                </Link>
                <button
                  type="button"
                  onClick={() => onOpenDiagram('stock-allocation')}
                  style={{
                    fontSize: '12px',
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Expand Diagram ⛶
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Closed Loop Settlements */}
          <div style={{
            background: 'rgb(255 255 255 / 0.04)',
            border: '1px solid rgb(255 255 255 / 0.12)',
            borderRadius: '24px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ position: 'relative', width: '100%', height: '200px', background: '#06122b' }}>
              <img
                src="/assets/banners/card-execution.webp"
                alt="Closed Loop Settlements Banner"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="qf-tag qf-tag--derived">IMMUTABLE LOGS</span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>Closed-Loop Execution</h3>
              <p style={{ fontSize: '14px', color: 'rgb(255 255 255 / 0.7)', lineHeight: 1.6, margin: 0 }}>
                Automatic dispatch order generation, customer email drafts, and complete step-by-step reasoning logs stored for enterprise audits.
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href={ROUTES.runs} className="qf-link" style={{ color: '#34d399' }}>
                  View agent runs ↗
                </Link>
                <button
                  type="button"
                  onClick={() => onOpenDiagram('execution-trace')}
                  style={{
                    fontSize: '12px',
                    color: '#34d399',
                    background: 'rgba(52, 211, 153, 0.1)',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Expand Diagram ⛶
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   FINAL EXECUTIVE CALL TO ACTION
   ───────────────────────────────────────────────────────────────────────────── */
function FinalCta() {
  return (
    <section className="qf-final">
      <div className="qf-wrap">
        <div className="qf-final__panel">
          <div style={{ maxWidth: '640px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7dd3fc', display: 'block', marginBottom: '12px' }}>
              Enterprise-Ready Deployment
            </span>
            <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 3.25rem)', fontWeight: 800, color: '#fff', lineHeight: 1.1, margin: '0 0 16px', letterSpacing: '-0.03em' }}>
              Transform your customer support into an autonomous powerhouse.
            </h2>
            <p style={{ fontSize: '16px', color: 'rgb(255 255 255 / 0.8)', lineHeight: 1.6, margin: '0 0 32px' }}>
              Connect your customer database, orders, and regional inventory. Deliver zero-hallucination settlements with full audit transparency.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              <Link href={ROUTES.cases} className="qf-btn qf-btn--primary qf-btn--lg">
                Launch Resolution Dashboard ↗
              </Link>
              <Link href={ROUTES.newCase} className="qf-btn qf-btn--glass qf-btn--lg">
                Record via Mic
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE ROOT
   ───────────────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [active, setActive] = useState(0)
  const [leaving, setLeaving] = useState<number | null>(null)
  const [diagramType, setDiagramType] = useState<DiagramType | null>(null)

  const selectScene = useCallback((i: number) => {
    if (i === active) return
    setLeaving(active)
    setActive(i)
    const t = window.setTimeout(() => setLeaving(null), 900)
    return () => clearTimeout(t)
  }, [active])

  return (
    <div className="qf">
      {/* Floating Pill Nav with mascot logo */}
      <Nav overLight={SCENES[active].tone === 'light'} />

      {/* Hero Carousel with 3 banners + glass view controller */}
      <Hero active={active} leaving={leaving} onSelect={selectScene} />

      {/* Standards strip */}
      <div className="qf-standards">
        <div className="qf-wrap">
          <div className="qf-standards__row">
            <p className="qf-standards__lead">Guaranteed operational principles behind every case resolution:</p>
            <ul className="qf-standards__list">
              {STANDARDS.map((s) => (
                <li key={s.name}>
                  <strong>{s.name}</strong>
                  <span>{s.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

            {/* Explore ResolveAI 2.0 Capabilities */}
      <CapabilitiesSection />

      {/* See ResolveAI in Action */}
      <SeeInActionSection />

      {/* 3-Card Feature Gallery using the 3 generated banners */}
      <FeatureGallery onOpenDiagram={setDiagramType} />

      {/* 5-Step Interactive Architecture Stepper */}
      <PipelineSection />

      {/* Final Executive CTA */}
      <FinalCta />

      {/* Click-to-Expand Feature Diagram Lightbox */}
      <DiagramModal type={diagramType} onClose={() => setDiagramType(null)} />
    </div>
  )
}
