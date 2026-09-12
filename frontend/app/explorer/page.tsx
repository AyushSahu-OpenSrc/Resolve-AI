'use client'

import { useEffect, useState } from 'react'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'

type Tab = 'customers' | 'orders' | 'inventory' | 'policies'

const TAB_LABELS: Record<Tab, string> = {
  customers: 'Customers',
  orders: 'Orders',
  inventory: 'Inventory',
  policies: 'Policies',
}

export default function ExplorerPage() {
  const [tab, setTab] = useState<Tab>('customers')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setData([])
    const fetcher = {
      customers: api.getCustomers,
      orders:    api.getOrders,
      inventory: api.getInventory,
      policies:  api.getPolicies,
    }[tab]
    fetcher()
      .then(setData)
      .finally(() => setLoading(false))
  }, [tab])

  const tabs: Tab[] = ['customers', 'orders', 'inventory', 'policies']

  return (
    <NavShell>
      <div className="page-header">
        <h1 className="text-title">Data Explorer</h1>
        <p className="text-caption" style={{ marginTop: '0.1875rem' }}>Browse live database state</p>
      </div>

      <div style={{ padding: '1.5rem 1.75rem' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '1px solid var(--line)' }}>
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem', fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t ? 'var(--signal)' : 'var(--ink-muted)',
                borderBottom: `2px solid ${tab === t ? 'var(--signal)' : 'transparent'}`,
                marginBottom: -1,
                transition: 'color 80ms, border-color 80ms',
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {loading && <div className="empty-state">Loading...</div>}

        {!loading && tab === 'customers' && (
          <div className="panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Tier</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c: any) => (
                  <tr key={c.id}>
                    <td className="mono" style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>{c.id}</td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem' }}>{c.email}</td>
                    <td>
                      <span className={`status-pill ${c.tier === 'premium' ? 'running' : c.tier === 'enterprise' ? 'resolved' : 'open'}`}>
                        {c.tier.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem' }}>{c.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'orders' && (
          <div className="panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Issue</th>
                  <th className="numeric">Amount</th>
                  <th>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {data.map((o: any) => (
                  <tr key={o.id}>
                    <td className="mono" style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>{o.id}</td>
                    <td className="mono" style={{ fontSize: '0.75rem' }}>{o.customer_id}</td>
                    <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{o.product_id}</td>
                    <td>
                      {o.status ? (
                        <span className={`status-pill ${o.status.replace(/_/g, '-')}`}>
                          {o.status.toUpperCase().replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>{o.issue_type || '—'}</td>
                    <td className="numeric mono">₹{o.total_amount?.toLocaleString()}</td>
                    <td style={{ color: 'var(--ink-muted)', fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'inventory' && (
          <div className="panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th className="numeric">Qty</th>
                  <th className="numeric">Reserved</th>
                  <th className="numeric">Available</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.map((inv: any) => (
                  <tr key={inv.id}>
                    <td className="mono" style={{ color: 'var(--ink-muted)', fontSize: '0.6875rem' }}>{inv.id}</td>
                    <td className="mono" style={{ fontSize: '0.75rem' }}>{inv.product_id}</td>
                    <td style={{ fontWeight: 500 }}>{inv.warehouse}</td>
                    <td className="numeric mono">{inv.quantity}</td>
                    <td className="numeric mono" style={{ color: inv.reserved_quantity > 0 ? 'var(--warning)' : 'var(--ink-muted)' }}>
                      {inv.reserved_quantity}
                    </td>
                    <td
                      className="numeric mono"
                      style={{
                        color: inv.available === 0 ? 'var(--error)' : inv.available === 1 ? 'var(--warning)' : 'var(--success)',
                        fontWeight: 600,
                      }}
                    >
                      {inv.available}
                    </td>
                    <td style={{ color: 'var(--ink-muted)', fontSize: '0.6875rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {inv.updated_at ? new Date(inv.updated_at).toLocaleTimeString('en-IN', { hour12: false }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'policies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.map((p: any) => (
              <div key={p.id} className="panel">
                <div className="panel-header">
                  <span className="mono" style={{ fontSize: '0.75rem' }}>{p.id}</span>
                  <span style={{ color: 'var(--ink-muted)', fontWeight: 400, fontSize: '0.8125rem' }}>{p.category}</span>
                  <span
                    className={`status-pill ${p.active ? 'resolved' : 'failed'}`}
                    style={{ marginLeft: 'auto' }}
                  >
                    {p.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="panel-body">
                  <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)', marginBottom: '1rem', lineHeight: 1.65 }}>
                    {p.policy_text}
                  </p>
                  <div style={{ fontSize: '0.625rem', fontWeight: 500, color: 'var(--ink-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Eligibility Rules (evaluated programmatically)
                  </div>
                  <pre style={{
                    fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    padding: '0.75rem', borderRadius: 4, overflowX: 'auto',
                    color: 'var(--ink)', lineHeight: 1.65,
                  }}>
                    {JSON.stringify(p.eligibility_rules, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </NavShell>
  )
}
