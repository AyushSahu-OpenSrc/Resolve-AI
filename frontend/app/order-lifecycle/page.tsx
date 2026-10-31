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
  IconFileText,
} from '@/components/icons'

const PRIMARY_LIFECYCLE_STATES = [
  { key: 'order_placed', label: 'Order Placed', icon: IconFileText, color: 'text-blue-600' },
  { key: 'confirmed', label: 'Confirmed', icon: IconCheck, color: 'text-emerald-600' },
  { key: 'processing', label: 'Processing', icon: IconBox, color: 'text-blue-600' },
  { key: 'shipped', label: 'Shipped', icon: IconTruck, color: 'text-indigo-600' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: IconTruck, color: 'text-amber-600' },
  { key: 'delivered', label: 'Delivered', icon: IconCheck, color: 'text-emerald-600' },
  { key: 'post_delivery_support', label: 'Post-Delivery Support', icon: IconShield, color: 'text-purple-600' },
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

  const currentStatus = timelineData?.current_status?.toLowerCase() || 'shipped'

  return (
    <NavShell>
      <div className="page-container space-y-6 pb-28">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                ResolveAI 2.0 Core
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Deterministic State Machine
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              End-to-End Order Lifecycle Journey
            </h1>
            <p className="text-sm text-slate-600">
              Deterministic state verification from order placement through fulfillment, exception handling, and post-delivery resolution.
            </p>
          </div>

          {/* Order Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0 self-start md:self-auto">
            <span className="text-xs text-slate-500 font-semibold px-2">Order:</span>
            {SAMPLE_ORDERS.map((oid) => (
              <button
                key={oid}
                onClick={() => setSelectedOrderId(oid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
                  selectedOrderId === oid
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {oid}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Primary Lifecycle Visual Pathway */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <IconBox size={16} className="text-blue-600" />
              Verified Lifecycle State Sequence
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase">
              Current: {currentStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {PRIMARY_LIFECYCLE_STATES.map((s, idx) => {
              const isCurrent = currentStatus === s.key
              const isPast =
                PRIMARY_LIFECYCLE_STATES.findIndex((x) => x.key === currentStatus) > idx
              const StateIcon = s.icon
              return (
                <div
                  key={s.key}
                  className={`p-3.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-500'
                      : isPast
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <StateIcon size={20} className={`mb-1.5 ${s.color}`} />
                  <span className="text-xs font-bold leading-tight">{s.label}</span>
                  <span className="text-[10px] font-mono mt-1">
                    {isCurrent ? 'Active State' : isPast ? 'Completed' : 'Pending'}
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
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <IconTruck size={18} className="text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Logistics & Courier Checkpoint Tracker</h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Carrier: {shipmentData?.carrier || 'BlueDart Express'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Tracking ID</span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {shipmentData?.tracking_number || 'BD-2026-9941'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Location</span>
                  <span className="text-xs font-semibold text-blue-700">
                    {shipmentData?.current_location || 'Pune Logistics Hub (Hub-B)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Transit Status</span>
                  <span className={`text-xs font-bold ${shipmentData?.is_delayed ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {shipmentData?.is_delayed ? 'Disruption Alert' : 'On Schedule'}
                  </span>
                </div>
              </div>

              {shipmentData?.delay_reason && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2 mb-4">
                  <IconAlert size={16} className="text-amber-600" />
                  <span><strong>Disruption Alert:</strong> {shipmentData.delay_reason}</span>
                </div>
              )}
            </div>

            {/* Event Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <IconClock size={18} className="text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Verified State Transition History</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">Immutable Event Log</span>
              </div>

              {loading ? (
                <div className="p-6 text-center text-sm text-slate-500">Loading event timeline...</div>
              ) : timelineData?.timeline && timelineData.timeline.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {timelineData.timeline.map((item: any, i: number) => (
                    <div key={item.id || i} className="relative">
                      <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-900 uppercase tracking-wider font-mono">
                            {item.previous_state || 'START'} → <strong className="text-blue-600">{item.new_state}</strong>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Reason: <span className="text-slate-900">{item.reason || 'Standard operational progression'}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Actor: <span className="font-mono text-blue-600 font-semibold">{item.actor || 'system'}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No state transition events logged yet for this order.
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Interactive State Transition Controller */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <IconShield size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Interactive State Transition Guard</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Test ResolveAI's state machine. Valid transitions succeed; invalid transitions (e.g. delivering an already cancelled order) are deterministically rejected.
              </p>

              <form onSubmit={handleTransition} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Target State
                  </label>
                  <select
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Responsible Actor
                  </label>
                  <select
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="system">Autonomous System</option>
                    <option value="chutku_agent">Chutku AI Agent</option>
                    <option value="customer">Customer Request</option>
                    <option value="supervisor">Human Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Transition Reason
                  </label>
                  <input
                    type="text"
                    value={transitionReason}
                    onChange={(e) => setTransitionReason(e.target.value)}
                    placeholder="e.g. Courier reports weather clearance"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={transitioning || !newState}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <IconSpark size={14} />
                  {transitioning ? 'Validating Transition...' : 'Dispatch State Transition'}
                </button>
              </form>

              {transitionResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs mt-4 ${
                    transitionResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    {transitionResult.success ? (
                      <>
                        <IconCheck size={14} className="text-emerald-600" /> Transition Permitted
                      </>
                    ) : (
                      <>
                        <IconAlert size={14} className="text-red-600" /> State Machine Guard Blocked
                      </>
                    )}
                  </div>
                  <p>{transitionResult.msg}</p>
                </div>
              )}
            </div>

            {/* Exceptional Branches Guide */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Permissible Exception Branches
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ResolveAI strictly blocks invalid state transitions (e.g. attempting to deliver a cancelled order or skipping transit checkpoints), preventing database corruption and hallucinated actions.
              </p>
              <div className="space-y-1.5 font-mono text-[10px] text-slate-700">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-blue-600 font-bold">Delay:</span> shipped → delivery_delayed → out_for_delivery
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-emerald-600 font-bold">Replace:</span> delivered → replacement_requested → replacement_dispatched
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-amber-600 font-bold">Refund:</span> post_delivery_support → refund_pending_approval → refunded
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NavShell>
  )
}
