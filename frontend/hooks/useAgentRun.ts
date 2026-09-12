/**
 * useAgentRun — polls GET /api/cases/{id}/events?since=<ts> every 700ms
 * while the case is active (running). Feels live without SSE/WebSocket.
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api, AgentEvent, CaseDetail } from '@/lib/api'

const POLL_INTERVAL_MS = 700

export function useAgentRun(caseId: string | null) {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastTimestampRef = useRef<string | undefined>(undefined)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const resetState = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    lastTimestampRef.current = undefined
    setEvents([])
    setCaseDetail(null)
    setIsRunning(false)
    setError(null)
  }, [])

  const fetchCaseDetail = useCallback(async () => {
    if (!caseId) return
    try {
      const data = await api.getCase(caseId)
      if (isMountedRef.current) setCaseDetail(data)
      return data
    } catch (e) {
      // silently fail on poll
    }
  }, [caseId])

  const fetchEvents = useCallback(async () => {
    if (!caseId) return
    try {
      const newEvents: AgentEvent[] = await api.getCaseEvents(caseId, lastTimestampRef.current)
      if (!isMountedRef.current) return

      if (newEvents.length > 0) {
        setEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id))
          const fresh = newEvents.filter(e => !existingIds.has(e.id))
          return [...prev, ...fresh].sort((a, b) => a.sequence_number - b.sequence_number)
        })
        // Update the timestamp to the latest event
        const latest = newEvents[newEvents.length - 1]
        lastTimestampRef.current = latest.timestamp
      }
    } catch (e) {
      // silently fail on poll
    }
  }, [caseId])

  const poll = useCallback(async () => {
    if (!isMountedRef.current) return
    const detail = await fetchCaseDetail()
    await fetchEvents()

    const isActive = detail?.status === 'running' || detail?.status === 'processing'
    setIsRunning(isActive)

    if (isActive && isMountedRef.current) {
      pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    } else {
      setIsRunning(false)
    }
  }, [fetchCaseDetail, fetchEvents])

  useEffect(() => {
    isMountedRef.current = true
    if (!caseId) return

    // Initial load
    lastTimestampRef.current = undefined
    setEvents([])
    setCaseDetail(null)
    setIsRunning(false)
    setError(null)

    poll()

    return () => {
      isMountedRef.current = false
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [caseId])

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    setIsRunning(true)
    poll()
  }, [poll])

  return { events, caseDetail, isRunning, error, startPolling, resetState, refetch: fetchCaseDetail }
}
