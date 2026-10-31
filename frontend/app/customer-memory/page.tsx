'use client'

import React, { useState, useEffect } from 'react'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'
import {
  IconUsers,
  IconShield,
  IconSpark,
  IconClock,
  IconCheck,
  IconBox,
  IconFileText,
  IconPlus,
  IconRefresh,
  IconAlert,
  IconMail,
} from '@/components/icons'

const SAMPLE_CUSTOMERS = [
  { id: 'CUST-001', name: 'Rahul Sharma', email: 'rahul.sharma@enterprise.com', tier: 'Enterprise Premium' },
  { id: 'CUST-004', name: 'Sneha Reddy', email: 'sneha.reddy@techhub.in', tier: 'Priority Business' },
  { id: 'CUST-002', name: 'Priya Patel', email: 'priya.patel@gmail.com', tier: 'Standard Customer' },
]

export default function CustomerMemoryPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CUST-001')
  const [memoryData, setMemoryData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newFact, setNewFact] = useState('')
  const [newCategory, setNewCategory] = useState('preference')
  const [submittingFact, setSubmittingFact] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchMemory = async (cid: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getCustomerMemory(cid)
      setMemoryData(data)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Failed to retrieve persistent memory records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMemory(selectedCustomerId)
  }, [selectedCustomerId])

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFact.trim()) return
    setSubmittingFact(true)
    try {
      await api.addCustomerFact(selectedCustomerId, newFact.trim(), newCategory, 0.95)
      setNewFact('')
      setSuccessMessage('Verified fact persisted to SQLite and hashed to audit chain.')
      setTimeout(() => setSuccessMessage(null), 4000)
      await fetchMemory(selectedCustomerId)
    } catch (err: any) {
      setError(err?.message || 'Failed to add verified fact')
    } finally {
      setSubmittingFact(false)
    }
  }

  return (
    <NavShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                ResolveAI 2.0 Core
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Persistent Memory Engine
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground mt-1">
              Customer Intelligence & Longitudinal Memory
            </h1>
            <p className="text-sm text-muted-foreground">
              Cross-session contextual memory, verified facts, polite feedback deferral, and follow-up pipelines.
            </p>
          </div>

          {/* Customer Switcher */}
          <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border">
            <span className="text-xs text-muted-foreground font-semibold px-2">Customer:</span>
            {SAMPLE_CUSTOMERS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCustomerId(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCustomerId === c.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {c.name.split(' ')[0]} ({c.id})
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchMemory(selectedCustomerId)}
              className="text-xs font-bold underline ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <IconCheck size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Top Profile Summary Card */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground font-black text-xl flex items-center justify-center shadow-md">
                {memoryData?.customer?.name ? memoryData.customer.name.slice(0, 2).toUpperCase() : 'CU'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {memoryData?.customer?.name || selectedCustomerId}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {memoryData?.customer?.tier || 'Enterprise Premium'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: <span className="font-mono text-foreground font-semibold">{selectedCustomerId}</span> • Email: <span className="text-foreground">{memoryData?.customer?.email || 'customer@resolveai.internal'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-border/60">
              <div className="text-right md:text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Verified Facts</span>
                <span className="text-lg font-mono font-bold text-primary">
                  {memoryData?.facts?.length || 0}
                </span>
              </div>
              <div className="text-right md:text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Lifetime Orders</span>
                <span className="text-lg font-mono font-bold text-foreground">
                  {memoryData?.orders?.length || 0}
                </span>
              </div>
              <div className="text-right md:text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Interactions</span>
                <span className="text-lg font-mono font-bold text-purple-400">
                  {memoryData?.conversations?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Verified Facts & Add Fact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Verified Facts vs Customer Claims */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
                <div className="flex items-center gap-2">
                  <IconShield size={18} className="text-primary" />
                  <h3 className="text-base font-bold text-foreground">Verified Long-Term Facts</h3>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  Ground Truth • Zero Hallucination
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading customer memory...</div>
              ) : memoryData?.facts && memoryData.facts.length > 0 ? (
                <div className="space-y-3">
                  {memoryData.facts.map((f: any, i: number) => (
                    <div
                      key={f.id || i}
                      className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20 uppercase">
                            {f.category || 'verified'}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {f.fact || f.preference_value || JSON.stringify(f)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Extracted from: <span className="font-mono text-foreground">{f.source || 'Interaction Analysis'}</span> • Verified Confidence: <span className="text-emerald-400 font-bold">{Math.round((f.confidence || 0.95) * 100)}%</span>
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {f.created_at ? new Date(f.created_at).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No verified facts currently stored for this customer profile. Use the injector to add one.
                </div>
              )}
            </div>

            {/* Conversation History Stream */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
                <div className="flex items-center gap-2">
                  <IconFileText size={18} className="text-purple-400" />
                  <h3 className="text-base font-bold text-foreground">Multi-Turn Conversation Records</h3>
                </div>
                <span className="text-xs text-muted-foreground">Persistent Across Sessions</span>
              </div>

              {memoryData?.conversations && memoryData.conversations.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {memoryData.conversations.map((c: any, i: number) => (
                    <div key={c.id || i} className="p-3.5 rounded-xl bg-muted/20 border border-border/60">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-primary font-mono">{c.id}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {c.created_at ? new Date(c.created_at).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 font-medium">
                        Summary: {c.summary || c.title || 'Support inquiry regarding order and replacement state.'}
                      </p>
                      {c.messages && c.messages.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-primary/30 space-y-1">
                          {c.messages.slice(0, 3).map((m: any, mi: number) => (
                            <p key={mi} className="text-[11px] text-muted-foreground">
                              <strong className="text-foreground capitalize">{m.role}:</strong> {m.content}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No previous multi-turn conversation logs found.
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Add Verified Fact & Deferred Tasks */}
          <div className="space-y-6">
            {/* Live Fact Injector */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <IconPlus size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-foreground">Inject Verified Memory Fact</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Simulate autonomous fact extraction from incoming audio or verified logistics manifest.
              </p>

              <form onSubmit={handleAddFact} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Fact Statement
                  </label>
                  <input
                    type="text"
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="e.g. prefers weekend deliveries between 2-6 PM"
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Fact Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="preference">Delivery / Communication Preference</option>
                    <option value="hardware_spec">Device / Hardware Context</option>
                    <option value="verified_incident">Damage / Logistics Incident</option>
                    <option value="vip_status">Customer Tier & Entitlement</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submittingFact || !newFact.trim()}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <IconShield size={14} />
                  {submittingFact ? 'Persisting to Memory...' : 'Commit to Persistent Memory'}
                </button>
              </form>
            </div>

            {/* Deferred Feedback Tasks */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3">
                <div className="flex items-center gap-2">
                  <IconClock size={16} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-foreground">Deferred Customer Feedback</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  Polite Delay
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                ResolveAI intentionally defers feedback surveys when customers face active delivery disruptions.
              </p>

              {memoryData?.feedback_items && memoryData.feedback_items.length > 0 ? (
                <div className="space-y-2">
                  {memoryData.feedback_items.map((fb: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs">
                      <div className="flex items-center justify-between font-mono mb-1">
                        <span className="text-primary font-bold">{fb.order_id}</span>
                        <span className="text-[10px] text-amber-400">Deferred +3 Days</span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Reason: {fb.deferral_reason || 'Active transit delay or replacement in progress.'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-muted-foreground text-center">
                  All customer satisfaction surveys currently aligned with delivery state.
                </div>
              )}
            </div>

            {/* Scheduled Follow-Up Tasks */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <IconMail size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold text-foreground">Automated Follow-Up Pipeline</h3>
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground">Replacement Delivery Check</span>
                    <span className="text-[10px] font-mono text-emerald-400">Scheduled</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Trigger automated WhatsApp notification once courier confirms out-for-delivery status.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NavShell>
  )
}

