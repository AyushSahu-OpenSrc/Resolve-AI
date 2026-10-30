'use client'

import Link from 'next/link'
import Image from 'next/image'
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(420px, 1fr) minmax(460px, 1.15fr)',
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Left Column: Sign In Form Card */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 32px',
        background: '#ffffff',
      }}>
        <div style={{ width: 'min(440px, 100%)' }}>
          {/* Logo & Header */}
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '28px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, overflow: 'hidden',
              background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Image src="/logo.png" alt="ResolveAI" width={38} height={38} style={{ objectFit: 'contain' }} priority />
            </div>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Resolve<span style={{ color: '#2563eb' }}>AI</span>
            </span>
          </Link>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
            Welcome back to ResolveAI
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
            Sign in to your organization workspace to inspect customer cases and manage resolutions.
          </p>

          <SignIn routing="hash" signUpUrl="/sign-up" fallbackRedirectUrl="/onboarding" />

          <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '24px' }}>
            By signing in, you agree to our <Link href="#" style={{ color: '#0f172a', textDecoration: 'underline' }}>Privacy Policy</Link> and Terms of Service.
          </p>
        </div>
      </section>

      {/* Right Column: High-Tech Analytics Hero Visual (Matches User Fintora Reference) */}
      <section style={{
        background: 'linear-gradient(135deg, #e0f2fe 0%, #eff6ff 45%, #e0e7ff 100%)',
        padding: '60px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '1px solid rgba(226, 232, 240, 0.8)',
      }}>
        {/* Ambient Glows */}
        <div style={{
          position: 'absolute', top: '10%', right: '10%', width: '320px', height: '320px',
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.4) 0%, transparent 70%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />

        <div style={{ width: 'min(520px, 100%)', position: 'relative', zIndex: 1 }}>
          {/* Card 1: Floating Stat / Improvement Rate */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: '20px',
            padding: '24px 28px',
            boxShadow: '0 12px 36px rgba(37, 99, 235, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            marginBottom: '20px',
            transform: 'translateY(-10px)',
          }}>
            <small style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resolution Efficiency
            </small>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0 16px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>126.6%</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: '20px' }}>
                +34.2% YoY
              </span>
            </div>

            {/* Sparkline curve */}
            <svg viewBox="0 0 360 70" fill="none" style={{ width: '100%', height: '54px' }}>
              <path
                d="M 10 50 Q 60 40 100 48 T 180 35 T 260 22 T 340 10"
                stroke="#2563eb"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="100" cy="48" r="4" fill="#2563eb" />
              <circle cx="260" cy="22" r="4" fill="#2563eb" />
              <circle cx="340" cy="10" r="5.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>

          {/* Card 2: Sales & Case Volume Chart */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            borderRadius: '20px',
            padding: '24px 28px',
            boxShadow: '0 16px 42px rgba(37, 99, 235, 0.1), 0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            marginBottom: '36px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Resolved Conflicts & Settlements</span>
                <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>Multi-warehouse fulfillment</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: '8px' }}>
                Pune Hub: Active
              </span>
            </div>

            {/* Bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '90px', padding: '0 4px' }}>
              {[
                { m: 'Jan', h: 32 }, { m: 'Feb', h: 48 }, { m: 'Mar', h: 40 },
                { m: 'Apr', h: 65 }, { m: 'May', h: 55 }, { m: 'Jun', h: 88, active: true },
                { m: 'Jul', h: 60 }, { m: 'Aug', h: 72 }, { m: 'Sep', h: 78 }, { m: 'Oct', h: 84 },
              ].map((bar) => (
                <div key={bar.m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '18px',
                    height: `${bar.h}%`,
                    borderRadius: '5px 5px 2px 2px',
                    background: bar.active
                      ? 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)'
                      : 'rgba(37, 99, 235, 0.35)',
                  }} />
                  <span style={{ fontSize: '10px', color: bar.active ? '#2563eb' : '#94a3b8', fontWeight: bar.active ? 700 : 500 }}>
                    {bar.m}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Copy from reference */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
              A Unified Hub for Smarter Dispute Resolution
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              ResolveAI empowers you with an evidence-grounded command centre—delivering deep customer insights and deterministic policy execution.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
