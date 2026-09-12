'use client'

import Link from 'next/link'
import { NavShell } from '@/components/NavShell'

const ArrowRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

export default function HomePage() {
  return (
    <NavShell>
      <div style={{ padding: '8rem 4rem', maxWidth: 1200, margin: '0 auto', fontFamily: 'Times New Roman, Times, serif' }}>
        
        <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
          <h1 className="text-hero" style={{ marginBottom: '2rem', color: 'var(--ink)' }}>
            Enterprise Customer Resolution
          </h1>
          <p className="text-body" style={{ maxWidth: 800, margin: '0 auto', fontSize: '1.5rem', lineHeight: 1.6, color: 'var(--ink-muted)', marginBottom: '3rem' }}>
            Elevate your customer experience with an autonomous agent that investigates issues, makes data-driven decisions, and executes resolutions across your systems.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link
              href="/cases"
              className="btn btn-primary"
              style={{ fontSize: '1.25rem', padding: '1rem 2rem', fontFamily: 'Times New Roman, Times, serif', borderRadius: '8px' }}
            >
              View Operations
            </Link>
            <Link
              href="/cases/new"
              className="btn btn-secondary"
              style={{ fontSize: '1.25rem', padding: '1rem 2rem', fontFamily: 'Times New Roman, Times, serif', borderRadius: '8px' }}
            >
              Start New Case
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', marginTop: '8rem' }}>
          <div>
            <h3 className="text-title" style={{ marginBottom: '1rem', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem' }}>Goal-Driven Execution</h3>
            <p className="text-body" style={{ color: 'var(--ink-muted)', fontSize: '1.125rem' }}>
              Provide the agent with a customer objective. It autonomously selects the optimal sequence of actions to resolve the issue based on real-time data.
            </p>
          </div>
          <div>
            <h3 className="text-title" style={{ marginBottom: '1rem', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem' }}>Dynamic Adaptation</h3>
            <p className="text-body" style={{ color: 'var(--ink-muted)', fontSize: '1.125rem' }}>
              When encountering conflicts or unavailable resources, the agent intelligently replans and finds alternative resolution paths without manual intervention.
            </p>
          </div>
          <div>
            <h3 className="text-title" style={{ marginBottom: '1rem', borderBottom: '2px solid var(--line)', paddingBottom: '0.5rem' }}>Independent Verification</h3>
            <p className="text-body" style={{ color: 'var(--ink-muted)', fontSize: '1.125rem' }}>
              Every action is independently verified against the database to ensure consistency and correctness before a case is marked as resolved.
            </p>
          </div>
        </div>

      </div>
    </NavShell>
  )
}
