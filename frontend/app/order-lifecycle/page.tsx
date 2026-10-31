'use client'

import React, { useState, useEffect } from 'react'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'
import {
  IconBox,
  IconTruck,
  IconClock,
  IconCheck,
  IconAlert,
  IconRefresh,
  IconShield,
  IconSpark,
  IconChevronRight,
} from '@/components/icons'

const PRIMARY_LIFECYCLE_STATES = [
  { key: 'order_placed', label: 'Order Placed', icon: '📝' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'processing', label: 'Processing', icon: '📦' },
  { key: 'shipped', label: 'Shipped', icon: '🚚' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
  { key: 'delivered', label: 'Delivered', icon: '🏠' },
  { key: 'post_delivery_support', label: 'Post-Delivery Support', icon: '🛡️' },
]

const SAMPLE_ORDERS = ['ORD-2026-LPT', 'ORD-1042', 'ORD-1043']

export default function OrderLifecyclePage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('ORD-2026-LPT')
  const [timelineData, setTimelineData] = useState<any | null>(null)
  const [shipmentData, setShipmentData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newState, setNewState] = useState('')
  const [transitionReason, setTransitionReason] = useState('')
  const [actor, setActor] = useState('system')
  const [transitioning, setTransitioning] = useState(false)
  const [transitionResult, setTransitionResult] = useState<{ success: boolean; msg: string } | null>(null)

  const loadOrderData = async (orderId: string) => {
    setLoading(true)
    setError(null)
    setTransitionResult(null)
    try {
      const [tl, sh] = await Promise.allSettled([
        api.getOrderTimeline(orderId),
        api.getShipment(orderId),
      ])
      if (tl.status === 'fulfilled') setTimelineData(tl.value)
      if (sh.status === 'fulfilled') setShipmentData(sh.value)
    } catch (err: any) {
      setError(err?.message || 'Failed to load order lifecycle details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrderData(selectedOrderId)
  }, [selectedOrderId])

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newState) return
    setTransitioning(true)
    setTransitionResult(null)
    try {
      const res = await api.transitionOrderLifecycle(selectedOrderId, {
        new_state: newState,
        actor,
        reason: transitionReason || 'Manual state progression demo',
      })
      setTransitionResult({
        success: true,
        msg: `Successfully transitioned order to "${newState}". Logged to event audit log.`,
      })
      setNewState('')
      setTransitionReason('')
      await loadOrderData(selectedOrderId)
    } catch (err: any) {
      setTransitionResult({
        success: false,
        msg: err?.message || 'State machine blocked invalid transition.',
      })
    } finally {
      setTransitioning(false)
    }
  }

  const currentStatus = timelineData?.current_status?.toLowerCase() || 'processing'

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
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Deterministic State Machine
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground mt-1">
              End-to-End Order Lifecycle Journey
            </h1>
            <p className="text-sm text-muted-foreground">
              Deterministic state verification from order placement through fulfillment, exception handling, and post-delivery resolution.
            </p>
          </div>

          {/* Order Selector */}
          <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border">
            <span className="text-xs text-muted-foreground font-semibold px-2">Inspect Order:</span>
            {SAMPLE_ORDERS.map((oid) => (
              <button
                key={oid}
                onClick={() => setSelectedOrderId(oid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedOrderId === oid
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {oid}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Primary Lifecycle Visual Pathway */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <IconBox size={16} className="text-primary" />
              Verified Lifecycle State Sequence
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold uppercase">
              Current: {currentStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {PRIMARY_LIFECYCLE_STATES.map((s, idx) => {
              const isCurrent = currentStatus === s.key
              const isPast =
                PRIMARY_LIFECYCLE_STATES.findIndex((x) => x.key === currentStatus) > idx
              return (
                <div
                  key={s.key}
                  className={`p-3.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary/15 text-primary shadow-md ring-1 ring-primary'
                      : isPast
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                      : 'border-border/60 bg-muted/20 text-muted-foreground'
                  }`}
                >
                  <span className="text-xl mb-1">{s.icon}</span>
                  <span className="text-xs font-bold leading-tight">{s.label}</span>
                  <span className="text-[10px] font-mono mt-1">
                    {isCurrent ? '● Active State' : isPast ? '✓ Completed' : 'Pending'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Grid: Logistics & Interactive State Controller */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Timeline & Shipment Tracking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipment Tracking Info */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
                <div className="flex items-center gap-2">
                  <IconTruck size={18} className="text-blue-400" />
                  <h3 className="text-base font-bold text-foreground">Logistics & Courier Checkpoint Tracker</h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  Carrier: {shipmentData?.carrier || 'BlueDart Express'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Tracking ID</span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {shipmentData?.tracking_number || 'BD-2026-9941'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Current Location</span>
                  <span className="text-xs font-semibold text-primary">
                    {shipmentData?.current_location || 'Pune Logistics Hub (Hub-B)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Transit Status</span>
                  <span className={`text-xs font-bold ${shipmentData?.is_delayed ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {shipmentData?.is_delayed ? '⚠️ Weather Delay Alert' : '✓ On Schedule'}
                  </span>
                </div>
              </div>

              {shipmentData?.delay_reason && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2 mb-4">
                  <IconAlert size={16} />
                  <span><strong>Disruption Alert:</strong> {shipmentData.delay_reason}</span>
                </div>
              )}
            </div>

            {/* Event Timeline */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
                <div className="flex items-center gap-2">
                  <IconClock size={18} className="text-primary" />
                  <h3 className="text-base font-bold text-foreground">Verified State Transition History</h3>
                </div>
                <span className="text-xs text-muted-foreground font-mono">Immutable Event Log</span>
              </div>

              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading event timeline...</div>
              ) : timelineData?.timeline && timelineData.timeline.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {timelineData.timeline.map((item: any, i: number) => (
                    <div key={item.id || i} className="relative">
                      <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-foreground uppercase tracking-wider font-mono">
                            {item.previous_state || 'START'} → <strong className="text-primary">{item.new_state}</strong>
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Reason: <span className="text-foreground">{item.reason || 'Standard operational progression'}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Actor: <span className="font-mono text-primary font-semibold">{item.actor || 'system'}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No state transition events logged yet for this order.
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Interactive State Transition Controller */}
          <div className="space-y-6">
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <IconShield size={18} className="text-primary" />
                <h3 className="text-sm font-bold text-foreground">Interactive State Transition Guard</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Test ResolveAI's state machine. Valid transitions succeed; invalid transitions (e.g. delivering an already cancelled order) are deterministically rejected.
              </p>

              <form onSubmit={handleTransition} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Target State
                  </label>
                  <select
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">Select target state...</option>
                    <optgroup label="Standard Lifecycle">
                      <option value="confirmed">confirmed</option>
                      <option value="processing">processing</option>
                      <option value="shipped">shipped</option>
                      <option value="out_for_delivery">out_for_delivery</option>
                      <option value="delivered">delivered</option>
                      <option value="post_delivery_support">post_delivery_support</option>
                    </optgroup>
                    <optgroup label="Exceptions & Resolutions">
                      <option value="delivery_delayed">delivery_delayed</option>
                      <option value="replacement_requested">replacement_requested</option>
                      <option value="replacement_dispatched">replacement_dispatched</option>
                      <option value="order_cancelled">order_cancelled</option>
                      <option value="refund_pending_approval">refund_pending_approval</option>
                      <option value="refunded">refunded</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Responsible Actor
                  </label>
                  <select
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="system">Autonomous System</option>
                    <option value="chutku_agent">Chutku AI Agent</option>
                    <option value="customer">Customer Request</option>
                    <option value="supervisor">Human Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Transition Reason
                  </label>
                  <input
                    type="text"
                    value={transitionReason}
                    onChange={(e) => setTransitionReason(e.target.value)}
                    placeholder="e.g. Courier reports weather clearance"
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={transitioning || !newState}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <IconSpark size={14} />
                  {transitioning ? 'Validating Transition...' : 'Dispatch State Transition'}
                </button>
              </form>

              {transitionResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs mt-4 ${
                    transitionResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-destructive/10 border-destructive/30 text-destructive'
                  }`}
                >
                  <div className="font-bold mb-1">
                    {transitionResult.success ? '✓ Transition Permitted' : '🛡️ State Machine Guard Blocked'}
                  </div>
                  <p>{transitionResult.msg}</p>
                </div>
              )}
            </div>

            {/* Exceptional Branches Guide */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Permissible Exception Branches
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                ResolveAI 2.0 strictly blocks invalid state transitions (e.g. attempting to deliver a cancelled order or skipping transit checkpoints), preventing database corruption and hallucinated actions.
              </p>
              <div className="space-y-1.5 font-mono text-[10px] text-muted-foreground">
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-primary font-bold">Delay:</span> shipped → delivery_delayed → out_for_delivery
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-emerald-400 font-bold">Replace:</span> delivered → replacement_requested → replacement_dispatched
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-amber-400 font-bold">Refund:</span> post_delivery_support → refund_pending_approval → refunded
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NavShell>
  )
}

