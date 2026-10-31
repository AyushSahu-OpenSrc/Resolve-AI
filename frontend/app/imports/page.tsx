'use client'

import { useRef, useState } from 'react'
import { NavShell } from '@/components/NavShell'
import { IconUsers, IconOrder, IconBox, IconShield, IconUpload, IconDownload, IconAlert, IconCheck } from '@/components/icons'
import { api } from '@/lib/api'

type Dataset = 'customers' | 'orders' | 'inventory' | 'policies'

type Spec = {
  title: string
  desc: string
  headers: string[]
  sample: string
  icon: typeof IconUsers
}

const specs: Record<Dataset, Spec> = {
  customers: {
    title: 'Customers',
    desc: 'Customer identifiers, names, contact emails, phone, and membership tiers.',
    headers: ['id', 'name', 'email', 'tier', 'phone'],
    sample: '/samples/customers.csv',
    icon: IconUsers,
  },
  orders: {
    title: 'Orders',
    desc: 'Order manifests, customer linkage, purchased SKU, delivery dates, and amounts.',
    headers: ['id', 'customer_id', 'product_id', 'status', 'total_amount', 'quantity', 'purchase_date', 'delivery_date', 'issue_type'],
    sample: '/samples/orders.csv',
    icon: IconOrder,
  },
  inventory: {
    title: 'Inventory',
    desc: 'SKU catalog and multi-warehouse physical stock levels (Mumbai, Pune, Bengaluru).',
    headers: ['id', 'product_id', 'product_name', 'sku', 'category', 'price', 'warehouse', 'quantity', 'reserved_quantity'],
    sample: '/samples/inventory.csv',
    icon: IconBox,
  },
  policies: {
    title: 'Policies',
    desc: 'Deterministic business rules, warranty conditions, and settlement matrices.',
    headers: ['id', 'category', 'policy_text', 'eligibility_rules'],
    sample: '/samples/policies.csv',
    icon: IconShield,
  },
}

export default function ImportsPage() {
  const [dataset, setDataset] = useState<Dataset>('customers')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string[][]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const selectFile = async (f?: File) => {
    setMessage(null)
    if (!f) {
      setFile(null)
      setPreview([])
      return
    }
    if (!/\.csv$/i.test(f.name)) {
      setMessage({ text: 'Please choose a valid .csv file.', ok: false })
      return
    }
    setFile(f)
    const text = await f.text()
    setPreview(
      text
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(0, 7)
        .map((line) => line.split(',').map((v) => v.trim().replace(/^"|"$/g, '')))
    )
  }

  const upload = async () => {
    if (!file) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await api.uploadCsv(dataset, file)
      setMessage({
        text: `Successfully imported ${result.imported ?? 'records'} into ${specs[dataset].title}!`,
        ok: true,
      })
      setFile(null)
      setPreview([])
      if (input.current) input.current.value = ''
    } catch (e) {
      setMessage({
        text: 'Import failed: ' + (e instanceof Error ? e.message : 'Unknown error'),
        ok: false,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <NavShell>
      <div className="ra-page">
        <div className="ra-page-heading">
          <div>
            <div className="ra-eyebrow">DATA OPERATIONS / IMPORT CENTER</div>
            <h1>Import Center & Datasets</h1>
            <p>
              Seed and populate your ResolveAI workspace with customer records, orders, warehouse inventory, and business policies.
            </p>
          </div>
          <span className="ra-tag info">Live Database Ingestion</span>
        </div>

        {/* Quick Sample Download Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(56, 189, 248, 0.06))',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--ink)' }}>
              Download Ready-to-Test Sample CSV Datasets
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-muted)' }}>
              Get calibrated test data featuring 10 customers, 11 multi-item orders, 14 warehouse stock entries, and 5 business policies.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="/samples/customers.csv"
              download="customers.csv"
              className="ra-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <IconDownload size={14} /> customers.csv
            </a>
            <a
              href="/samples/inventory.csv"
              download="inventory.csv"
              className="ra-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <IconDownload size={14} /> inventory.csv
            </a>
            <a
              href="/samples/orders.csv"
              download="orders.csv"
              className="ra-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <IconDownload size={14} /> orders.csv
            </a>
            <a
              href="/samples/policies.csv"
              download="policies.csv"
              className="ra-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <IconDownload size={14} /> policies.csv
            </a>
            <a
              href="/samples/conflicts.csv"
              download="conflicts.csv"
              className="ra-button primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <IconDownload size={14} /> conflicts.csv
            </a>
          </div>
        </div>

        {/* Dataset Selector Tabs */}
        <div className="ra-grid ra-grid-4 ra-import-types">
          {(Object.keys(specs) as Dataset[]).map((d) => {
            const ItemIcon = specs[d].icon
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDataset(d)
                  setFile(null)
                  setPreview([])
                  setMessage(null)
                }}
                className={'ra-import-type ' + (dataset === d ? 'selected' : '')}
              >
                <span className="ra-import-icon">
                  <ItemIcon width={20} height={20} />
                </span>
                <strong>{specs[d].title}</strong>
                <small>{specs[d].desc}</small>
                <span className="ra-import-choice">{dataset === d ? 'Selected' : 'Choose dataset'} →</span>
              </button>
            )
          })}
        </div>

        {/* Upload & Expected Fields Layout */}
        <div className="ra-import-layout">
          <section className="ra-card">
            <div className="ra-card-head">
              <div>
                <h2>Upload {specs[dataset].title} CSV</h2>
                <p>Upload a UTF-8 encoded .csv file with matching column headers.</p>
              </div>
              <a
                href={specs[dataset].sample}
                download={`${dataset}.csv`}
                className="ra-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
              >
                <IconDownload size={13} /> Download {dataset}.csv
              </a>
            </div>
            <div className="ra-card-body">
              <input
                ref={input}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => selectFile(e.target.files?.[0])}
              />
              <button
                type="button"
                className="ra-dropzone"
                onClick={() => input.current?.click()}
              >
                <span className="ra-drop-icon">
                  <IconUpload width={22} height={22} />
                </span>
                <strong>{file ? file.name : 'Choose a CSV file or browse'}</strong>
                <small>
                  {file
                    ? (file.size / 1024).toFixed(1) + ' KB · review preview below'
                    : 'CSV only · First line must contain header names'}
                </small>
                <span className="ra-button">Browse files</span>
              </button>

              {message && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    background: message.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: message.ok ? '#34d399' : '#f87171',
                    border: `1px solid ${message.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  {message.ok ? <IconCheck size={16} /> : <IconAlert size={16} />}
                  <span>{message.text}</span>
                </div>
              )}

              {file && (
                <div className="ra-import-actions" style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="ra-button"
                    onClick={() => {
                      setFile(null)
                      setPreview([])
                      setMessage(null)
                      if (input.current) input.current.value = ''
                    }}
                  >
                    Remove file
                  </button>
                  <button
                    type="button"
                    className="ra-button primary"
                    disabled={busy}
                    onClick={upload}
                  >
                    {busy ? 'Importing…' : `Import ${specs[dataset].title} ↗`}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="ra-card">
            <div className="ra-card-head">
              <div>
                <h2>Expected Columns</h2>
                <p>All rows are verified by the backend transaction before committing.</p>
              </div>
            </div>
            <div className="ra-card-body">
              <div className="ra-field-chips">
                {specs[dataset].headers.map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
              <div className="ra-alert" style={{ marginTop: 16 }}>
                <strong>Multi-Hub Ordering Tip:</strong> For new systems, import <code>customers.csv</code> and <code>inventory.csv</code> before <code>orders.csv</code> so all linked customer and product IDs exist in the database.
              </div>
            </div>
          </section>
        </div>

        {/* CSV Preview Table */}
        {preview.length > 0 && (
          <section className="ra-card" style={{ marginTop: 16 }}>
            <div className="ra-card-head">
              <div>
                <h2>File Preview</h2>
                <p>First {preview.length} rows from selected {file?.name}</p>
              </div>
              <span className="ra-tag info">Ready to Import</span>
            </div>
            <div className="ra-table-wrap">
              <table className="ra-table">
                <tbody>
                  {preview.map((row, i) => (
                    <tr
                      key={i}
                      style={i === 0 ? { background: 'rgba(255, 255, 255, 0.05)', fontWeight: 700 } : undefined}
                    >
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          style={i === 0 ? { fontWeight: 700, color: '#38bdf8' } : undefined}
                        >
                          {cell || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="ra-page-footer">
          <span>Imports are validated and committed directly to the SQLite backend database.</span>
          <span>Open cases immediately reflect imported inventory and customer records.</span>
        </div>
      </div>
    </NavShell>
  )
}
