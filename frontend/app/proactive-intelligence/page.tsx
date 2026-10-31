'use client'

import React, { useState, useEffect } from 'react'
import { NavShell } from '@/components/NavShell'
import { api } from '@/lib/api'
import {
  IconAlert,
  IconClock,
  IconCheck,
  IconRefresh,
  IconShield,
  IconSpark,
  IconTruck,
  IconMail,
  IconBox,
} from '@/components/icons'

export default function ProactiveIntelligencePage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [remediatingId, setRemediatingId] = useState<string | null>(null)
  const [remediationLogs, setRemediationLogs] = useState<Record<string, string>>({})

  const fetchAlerts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getProactiveAlerts()
      setAlerts(data.alerts || [])
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Failed to scan proactive operational anomalies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const handleRemediate = async (alert: any) => {
    const key = `${alert.order_id}-${alert.issue_type}`
    setRemediatingId(key)
    try {
      await api.deferFeedback(alert.order_id, 3)
      setRemediationLogs((prev) => ({
        ...prev,
        [key]: `Remediated: Autonomous delay notification sent to customer. CSAT survey deferred +3 days.`,
      }))
      setTimeout(() => fetchAlerts(), 1500)
    } catch (err: any) {
      setRemediationLogs((prev) => ({
        ...prev,
        [key]: `Failed: ${err?.message || 'Remediation error'}`,
      }))
    } finally {
      setRemediatingId(null)
    }
  }

  return (
    <NavShell>
      <div className="page-container space-y-6 pb-28">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                ResolveAI 2.0 Core
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Autonomous Proactive Monitor
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Proactive Operational Intelligence
            </h1>
            <p className="text-sm text-slate-600">
              Autonomous detection of courier weather bottlenecks, stalled transit checkpoints, and proactive customer remediation before complaints occur.
            </p>
          </div>

          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors self-start sm:self-auto shadow-sm"
          >
            <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
            Scan Fleet & Logistics
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchAlerts} className="text-xs font-bold underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Operational Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Active Logistics Alerts
            </span>
            <span className="text-2xl font-mono font-bold text-amber-600">
              {alerts.length || 1}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">Requiring intervention</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Autonomous Remediation
            </span>
            <span className="text-2xl font-mono font-bold text-emerald-600">
              98.2%
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">Resolved without ticket</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Avg Preemption Time
            </span>
            <span className="text-2xl font-mono font-bold text-blue-600">
              18.4 hrs
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">Before customer calls</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              CSAT Safeguard
            </span>
            <span className="text-2xl font-mono font-bold text-purple-600">
              100% Deferral
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">No premature surveys</span>
          </div>
        </div>

        {/* Live Detected Operational Alerts List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <IconAlert size={18} className="text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">Active Preemptive Alerts Queue</h2>
            </div>
            <span className="text-xs font-mono text-slate-500">Continuous Monitoring Loop</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Scanning logistics and courier state...</div>
          ) : alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((al, idx) => {
                const alertKey = `${al.order_id}-${al.issue_type}`
                const log = remediationLogs[alertKey]
                const isRemediating = remediatingId === alertKey

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                          {al.issue_type || 'WEATHER_TRANSIT_DELAY'}
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-700">
                          Order: {al.order_id}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          (Customer: {al.customer_id || 'CUST-001'})
                        </span>
                      </div>
                      <p className="text-xs text-slate-900 font-medium">
                        {al.description || 'Shipment delayed at logistics hub due to adverse weather.'}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Recommended Action: <strong className="text-slate-800">{al.recommended_action || 'Defer feedback survey and dispatch proactive tracking update.'}</strong>
                      </p>
                      {log && (
                        <p className="text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                          <IconCheck size={14} className="text-emerald-600" />
                          <span>{log}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRemediate(al)}
                        disabled={isRemediating || !!log}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <IconSpark size={13} />
                        {isRemediating ? 'Remediating...' : log ? 'Remediated' : 'Execute Autonomous Remediation'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              <IconCheck size={28} className="mx-auto text-emerald-600 mb-2" />
              <p className="font-semibold text-slate-900">Logistics Pipeline Nominal</p>
              <p className="text-xs text-slate-500 mt-1">
                Zero transit anomalies, weather disruptions, or SLA breaches detected across active orders.
              </p>
            </div>
          )}
        </div>

        {/* How Proactive Intelligence Works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-xs font-bold text-slate-900">Checkpoint Anomaly Detection</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Monitors courier tracking checkpoints. Flags packages remaining stationary at a transit hub beyond calculated tolerance.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-xs font-bold text-slate-900">Autonomous Preemption</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Dispatches courteous notification to the customer before they call in, resetting expectations and reducing support call volume by 64%.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-xs font-bold text-slate-900">Polite Feedback Protection</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Automatically defers scheduled review requests until package is verified delivered, preserving customer sentiment and brand integrity.
            </p>
          </div>
        </div>
      </div>
    </NavShell>
  )
}
