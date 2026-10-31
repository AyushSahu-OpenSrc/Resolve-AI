'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'
import { IconMic } from '@/components/icons'

type Customer = { id: string; name: string; email: string; tier: string }
type Order = { id: string; customer_id: string; product_id: string; status: string; issue_type: string | null; total_amount: number }

const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const ChevronLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

export default function NewCasePage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [form, setForm] = useState({
    customer_id: '',
    order_id: '',
    customer_message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const baseTextRef = useRef<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechSupported(true)
      }
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [])

  const toggleListening = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
      setIsListening(false)
      recognitionRef.current = null
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      baseTextRef.current = form.customer_message.trim()

      recognition.onresult = (event: any) => {
        let final = ''
        let interim = ''
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) {
            final += res[0].transcript
          } else {
            interim += res[0].transcript
          }
        }
        const spoken = [final.trim(), interim.trim()].filter(Boolean).join(' ')
        const combined = [baseTextRef.current, spoken].filter(Boolean).join(' ')
        setForm(f => ({
          ...f,
          customer_message: combined,
        }))
      }

      recognition.onerror = () => {
        setIsListening(false)
        recognitionRef.current = null
      }
      recognition.onend = () => {
        setIsListening(false)
        recognitionRef.current = null
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
    } catch (err) {
      console.error(err)
      setIsListening(false)
      recognitionRef.current = null
    }
  }

  useEffect(() => {
    // Prefill from the Ask AI panel (/cases/new?message=...)
    const prefill = new URLSearchParams(window.location.search).get('message')
    if (prefill) setForm(f => ({ ...f, customer_message: prefill }))
  }, [])

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getOrders()])
      .then(([cList, oList]) => {
        setCustomers(cList)
        setOrders(oList)
        setFilteredOrders(oList)
      })
  }, [])

  useEffect(() => {
    if (form.customer_id) {
      setFilteredOrders(orders.filter(o => o.customer_id === form.customer_id))
    } else {
      setFilteredOrders(orders)
    }
  }, [form.customer_id, orders])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customer_id || !form.order_id || !form.customer_message.trim()) {
      setError('All fields are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const newCase = await api.createCase(form)
      await api.resolveCase(newCase.id)
      router.push(`/cases/${newCase.id}`)
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      setError(errorMsg)
      setSubmitting(false)
    }
  }

  const selectedCustomer = customers.find(c => c.id === form.customer_id)

  return (
    <NavShell>
      <main className="ra-page ra-new-case">
        <header className="ra-page-heading">
          <div>
            <div className="ra-eyebrow">Customer operations / New Case</div>
            <h1>New Case</h1>
            <p>Link a customer to one of their orders, then give the agent a clear outcome to work toward.</p>
          </div>
          <Link href="/cases" className="ra-button">Back to cases</Link>
        </header>
        <div className="ra-new-case-layout">
          <div className="ra-new-case-form">



        <form onSubmit={handleSubmit}>
          <div className="panel">
            <div className="panel-header" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
              Case Details
            </div>
            <div style={{ padding: '1.25rem 1.25rem 1.5rem' }}>

              {/* Customer */}
              <div style={{ marginBottom: '1.125rem' }}>
                <label className="form-label" htmlFor="customer_id">Customer</label>
                <select
                  id="customer_id"
                  className="form-select"
                  value={form.customer_id}
                  onChange={e => setForm(f => ({ ...f, customer_id: e.target.value, order_id: '' }))}
                >
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id}) — {c.tier}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="form-hint" style={{ fontFamily: 'IBM Plex Mono, monospace', marginTop: '0.25rem' }}>
                    {selectedCustomer.email} &nbsp;·&nbsp; <span style={{ color: selectedCustomer.tier === 'premium' ? 'var(--signal)' : undefined }}>{selectedCustomer.tier}</span>
                  </div>
                )}
              </div>

              {/* Order */}
              <div style={{ marginBottom: '1.125rem' }}>
                <label className="form-label" htmlFor="order_id">Order</label>
                <select
                  id="order_id"
                  className="form-select"
                  value={form.order_id}
                  onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}
                  disabled={!form.customer_id}
                >
                  <option value="">Select order...</option>
                  {filteredOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {o.status}{o.issue_type ? ` (${o.issue_type})` : ''} — ₹{o.total_amount?.toLocaleString()}
                    </option>
                  ))}
                </select>
                {!form.customer_id && (
                  <div className="form-hint">Select a customer first</div>
                )}
              </div>

              {/* Message */}
              <div style={{ marginBottom: '1.125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" htmlFor="customer_message" style={{ margin: 0 }}>Customer conflict / message</label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        borderRadius: '12px',
                        border: `1px solid ${isListening ? 'var(--error)' : 'var(--line)'}`,
                        background: isListening ? 'var(--error-tint)' : 'var(--panel)',
                        color: isListening ? 'var(--error)' : 'var(--ink-muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isListening ? (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--error, #ef4444)', display: 'inline-block' }} />
                      ) : (
                        <IconMic size={14} />
                      )}
                      <span>{isListening ? 'Listening…' : 'Speak with Mic'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  id="customer_message"
                  className="form-textarea"
                  value={form.customer_message}
                  onChange={e => setForm(f => ({ ...f, customer_message: e.target.value }))}
                  placeholder="Describe the customer's issue or click 'Speak with Mic' to dictate..."
                  rows={4}
                />
                <div className="form-hint">
                  {form.customer_message.length} chars — the agent will use this as its resolution goal
                </div>
              </div>



              {error && (
                <div style={{
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  background: 'var(--error-tint)',
                  border: '1px solid rgba(166,58,46,0.3)',
                  borderRadius: 4,
                  fontSize: '0.875rem',
                  color: 'var(--error)',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Link href="/cases" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
                  Cancel
                </Link>
                <button
                  id="btn-run-resolveai"
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !form.customer_id || !form.order_id}
                  style={{ fontSize: '0.875rem', gap: '0.5rem' }}
                >
                  <ZapIcon />
                  {submitting ? 'Starting agent...' : 'Run ResolveAI'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* What happens next */}
        <div style={{ marginTop: '1.5rem', padding: '0 0.25rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.75rem' }}>
            What happens when you submit
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              'Case is created in the database',
              'Agent begins resolution immediately',
              'You are redirected to the live Operations Log',
              'Agent investigates, decides, acts, verifies — all visible in real time',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--surface-raised)', border: '1px solid var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.5625rem', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace',
                  color: 'var(--ink-muted)', flexShrink: 0, marginTop: 1,
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
          </div>
          <aside className="ra-new-case-aside">
            <h2>What ResolveAI does next</h2>
            <p>The agent works toward the customer's requested outcome against the records and policies in this workspace.</p>
            <ol>
              <li>Inspect customer, order and product evidence</li>
              <li>Evaluate the configured policy</li>
              <li>Choose tools and adapt to real failures</li>
              <li>Verify the resulting order and inventory state</li>
            </ol>
            <p className="ra-muted">Actions are reported only after the backend records their outcome.</p>
          </aside>
        </div>
      </main>
    </NavShell>
  )
}
