'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [uploading, setUploading] = useState(false)
  
  // Policy Modal State
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = () => {
    setLoading(true)
    const fetcher = {
      customers: api.getCustomers,
      orders:    api.getOrders,
      inventory: api.getInventory,
      policies:  api.getPolicies,
    }[tab]
    fetcher()
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [tab])

  const tabs: Tab[] = ['customers', 'orders', 'inventory', 'policies']

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (tab === 'policies') return

    setUploading(true)
    try {
      await api.uploadCsv(tab, file)
      alert('Upload successful!')
      fetchData() // Refresh data
    } catch (err: any) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  
  const handlePolicySave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const payload = {
      id: formData.get('id') as string,
      category: formData.get('category') as string,
      policy_text: formData.get('policy_text') as string,
      eligibility_rules: JSON.parse(formData.get('eligibility_rules') as string)
    }
    
    try {
      if (editingPolicy && editingPolicy.id) {
        await api.updatePolicy(payload.id, payload)
      } else {
        await api.createPolicy(payload)
      }
      setShowPolicyModal(false)
      fetchData()
    } catch (err: any) {
      alert('Failed to save policy: ' + err.message)
    }
  }

  const handlePolicyDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return
    try {
      await api.deletePolicy(id)
      fetchData()
    } catch (err: any) {
      alert('Failed to delete policy: ' + err.message)
    }
  }

  return (
    <NavShell>
      <div className="page-header">
        <h1 className="text-title">Data Explorer</h1>
        <p className="text-caption" style={{ marginTop: '0.1875rem' }}>Browse live database state</p>
      </div>

      <div style={{ padding: '1.5rem 1.75rem' }}>
        {/* Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)' }}>
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
          
          {/* Action Buttons */}
          <div>
            {tab !== 'policies' && (
              <>
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload} 
                />
                <button 
                  className="btn btn-secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Importing...' : 'Import CSV'}
                </button>
              </>
            )}
            {tab === 'policies' && (
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setEditingPolicy(null)
                  setShowPolicyModal(true)
                }}
              >
                Add Policy
              </button>
            )}
          </div>
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
                        {c.tier ? c.tier.toUpperCase() : 'STANDARD'}
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
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span className="mono" style={{ fontSize: '0.75rem', marginRight: '0.5rem' }}>{p.id}</span>
                    <span style={{ color: 'var(--ink-muted)', fontWeight: 400, fontSize: '0.8125rem', marginRight: '1rem' }}>{p.category}</span>
                    <span className={`status-pill ${p.active ? 'resolved' : 'failed'}`}>
                      {p.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setEditingPolicy(p)
                        setShowPolicyModal(true)
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--error)' }}
                      onClick={() => handlePolicyDelete(p.id)}
                    >
                      Delete
                    </button>
                  </div>
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

      {/* Policy Modal */}
      {showPolicyModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: 500, background: 'var(--surface-raised)' }}>
            <div className="panel-header" style={{ fontWeight: 600 }}>
              {editingPolicy ? 'Edit Policy' : 'Add Policy'}
            </div>
            <form onSubmit={handlePolicySave} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="id">ID</label>
                <input 
                  className="form-input" 
                  id="id" 
                  name="id" 
                  defaultValue={editingPolicy?.id || ''} 
                  required 
                  readOnly={!!editingPolicy}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="category">Category</label>
                <input 
                  className="form-input" 
                  id="category" 
                  name="category" 
                  defaultValue={editingPolicy?.category || ''} 
                  required 
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="policy_text">Policy Text</label>
                <textarea 
                  className="form-textarea" 
                  id="policy_text" 
                  name="policy_text" 
                  defaultValue={editingPolicy?.policy_text || ''} 
                  required 
                  rows={4}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="eligibility_rules">Eligibility Rules (JSON)</label>
                <textarea 
                  className="form-textarea" 
                  id="eligibility_rules" 
                  name="eligibility_rules" 
                  defaultValue={editingPolicy ? JSON.stringify(editingPolicy.eligibility_rules, null, 2) : '{\n  \n}'} 
                  required 
                  rows={4}
                  style={{ width: '100%', fontFamily: 'IBM Plex Mono, monospace' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowPolicyModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Policy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </NavShell>
  )
}
