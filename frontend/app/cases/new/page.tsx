'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'

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
    demo_mode: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const prefillDemo = () => {
    setForm({
      customer_id: 'CUST-001',
      order_id: 'ORD-1042',
      customer_message: 'My order arrived damaged. I want a replacement.',
      demo_mode: true,
    })
  }

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
    } catch (e: any) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  const selectedCustomer = customers.find(c => c.id === form.customer_id)

  return (
    <NavShell>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link href="/cases" style={{ color: 'var(--ink-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft />
          </Link>
          <span style={{ color: 'var(--line)' }}>/</span>
          <h1 className="text-title">New Case</h1>
        </div>
      </div>

      <div style={{ maxWidth: 580, margin: '2.5rem auto', padding: '0 2rem' }}>



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
                <label className="form-label" htmlFor="customer_message">Customer message</label>
                <textarea
                  id="customer_message"
                  className="form-textarea"
                  value={form.customer_message}
                  onChange={e => setForm(f => ({ ...f, customer_message: e.target.value }))}
                  placeholder="Describe the customer's issue as they would state it..."
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
          <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
    </NavShell>
  )
}
