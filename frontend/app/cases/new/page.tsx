'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'

type Customer = { id: string; name: string; email: string; tier: string }
type Order = { id: string; customer_id: string; product_id: string; status: string; issue_type: string | null; total_amount: number }

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
      // Immediately start resolution
      await api.resolveCase(newCase.id)
      router.push(`/cases/${newCase.id}`)
    } catch (e: any) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <NavShell>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/cases" style={{ color: 'var(--ink-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
            Cases
          </Link>
          <span style={{ color: 'var(--line)' }}>/</span>
          <h1 className="text-title">New Case</h1>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '2rem auto', padding: '0 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={prefillDemo}
            style={{ fontSize: '0.8125rem' }}
          >
            Prefill Demo Case
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="panel" style={{ padding: '1.5rem' }}>
            
            <div style={{ marginBottom: '1.25rem' }}>
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
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="order_id">Order</label>
              <select
                id="order_id"
                className="form-select"
                value={form.order_id}
                onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}
              >
                <option value="">Select order...</option>
                {filteredOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.id} — {o.status}{o.issue_type ? ` (${o.issue_type})` : ''} — ₹{o.total_amount}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="customer_message">Customer message</label>
              <textarea
                id="customer_message"
                className="form-textarea"
                value={form.customer_message}
                onChange={e => setForm(f => ({ ...f, customer_message: e.target.value }))}
                placeholder="Describe the issue as the customer would..."
                rows={4}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.demo_mode}
                  onChange={e => setForm(f => ({ ...f, demo_mode: e.target.checked }))}
                  style={{ accentColor: 'var(--signal)' }}
                />
                <span className="text-label">Enable demo conflict</span>
                <span className="text-caption">(forces inventory conflict + replan)</span>
              </label>
            </div>

            {error && (
              <div style={{
                padding: '0.75rem', marginBottom: '1rem',
                background: 'var(--error-tint)', border: '1px solid var(--error)',
                borderRadius: 4, fontSize: '0.875rem', color: 'var(--error)',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Link href="/cases" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Starting agent...' : 'Run ResolveAI'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </NavShell>
  )
}
