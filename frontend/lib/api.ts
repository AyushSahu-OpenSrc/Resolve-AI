/**
 * ResolveAI — Centralized API Client & Cloud Resilience Layer
 *
 * Implements:
 * - Smart Same-Origin /api Proxying (Next.js rewrites) + Direct Backend Fallback
 * - Render Free-Tier Cold-Start Tolerance (timeouts, backoff, connection state)
 * - Fine-grained CORS optimization (no Content-Type on bodyless GET requests)
 * - Diagnostic Error Categorization (distinguishes cold starts, 404s, CORS, 500s)
 * - Server-Sent Events (SSE) streaming for real-time Chutku chat
 * - Binary TTS streaming for neural voice generation
 */

export type ApiErrorCode =
  | 'BACKEND_UNREACHABLE'
  | 'COLD_START_TIMEOUT'
  | 'CORS_BLOCKED'
  | 'NOT_FOUND'
  | 'AUTH_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'INTERNAL_SERVER_ERROR'
  | 'UNEXPECTED_RESPONSE'
  | 'UNKNOWN_ERROR'

export class ApiError extends Error {
  code: ApiErrorCode
  status?: number
  endpoint: string
  backendUrl: string

  constructor(message: string, code: ApiErrorCode, endpoint: string, backendUrl: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.endpoint = endpoint
    this.backendUrl = backendUrl
  }
}

/**
 * Resolves the active backend URL:
 * 1. Explicit NEXT_PUBLIC_API_URL environment variable if set
 * 2. On browser HTTPS (Render / Custom Domain): Same-origin relative path ''
 *    which passes through Next.js rewrite proxy to avoid mixed-content and CORS preflights
 * 3. Localhost development: http://127.0.0.1:8000
 */
export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('resolveai_api_url')
      if (custom && custom.startsWith('http')) {
        return custom.replace(/\/$/, '')
      }
    } catch {}

    // On HTTPS production deployments, use same-origin relative path (Next.js proxy rewrite)
    if (window.location.protocol === 'https:') {
      return ''
    }
  }

  return 'http://127.0.0.1:8000'
}

export function getDirectBackendUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  }
  return 'https://resolveai-backend-8aw7.onrender.com'
}

function categorizeHttpError(status: number, body: string, endpoint: string, backendUrl: string): ApiError {
  let message = `API request to ${endpoint} failed with HTTP ${status}.`
  try {
    const parsed = JSON.parse(body)
    if (parsed.detail) message = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail)
  } catch {
    if (body) message = body.slice(0, 150)
  }

  if (status === 404) {
    return new ApiError(message || `Resource not found: ${endpoint}`, 'NOT_FOUND', endpoint, backendUrl, status)
  }
  if (status === 401) {
    return new ApiError('Authentication required to access workspace API.', 'AUTH_REQUIRED', endpoint, backendUrl, status)
  }
  if (status === 403) {
    return new ApiError('Permission denied for this operation.', 'PERMISSION_DENIED', endpoint, backendUrl, status)
  }
  if (status >= 500) {
    return new ApiError(`Backend server error (${status}): ${message}`, 'INTERNAL_SERVER_ERROR', endpoint, backendUrl, status)
  }
  return new ApiError(message, 'UNKNOWN_ERROR', endpoint, backendUrl, status)
}

function categorizeFetchError(err: unknown, endpoint: string, backendUrl: string): ApiError {
  if (err instanceof ApiError) return err

  const resolvedUrl = backendUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://resolveai-backend-8aw7.onrender.com')

  if (err instanceof DOMException && err.name === 'AbortError') {
    return new ApiError(
      `Connection to ResolveAI backend timed out at ${resolvedUrl}. The instance may be waking from a free-tier cold start (15-45s).`,
      'COLD_START_TIMEOUT',
      endpoint,
      resolvedUrl
    )
  }

  if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
    return new ApiError(
      `Unable to reach ResolveAI backend at ${resolvedUrl}. Please ensure the service is running and CORS is permitted.`,
      'BACKEND_UNREACHABLE',
      endpoint,
      resolvedUrl
    )
  }

  const msg = err instanceof Error ? err.message : String(err)
  return new ApiError(msg, 'UNKNOWN_ERROR', endpoint, resolvedUrl)
}

async function apiFetch(path: string, options?: RequestInit) {
  const base = getApiBase()
  const url = `${base}${path}`

  const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) }

  // Only attach Content-Type: application/json if there is an actual request payload!
  // Bodyless GET/DELETE/HEAD requests must avoid setting Content-Type to avoid CORS preflight overhead.
  if (options?.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const controller = new AbortController()
  const timeoutMs = options?.method === 'POST' ? 35000 : 25000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: options?.signal || controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '')
      throw categorizeHttpError(res.status, errorBody, path, base)
    }
    return await res.json()
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    throw categorizeFetchError(err, path, base)
  }
}

async function apiUpload(path: string, file: File) {
  const base = getApiBase()
  const url = `${base}${path}`
  const formData = new FormData()
  formData.append('file', file)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000)

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '')
      throw categorizeHttpError(res.status, errorBody, path, base)
    }
    return await res.json()
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    throw categorizeFetchError(err, path, base)
  }
}

export const api = {
  // Health check endpoint
  health: (): Promise<{ status: string; service: string; version: string }> =>
    apiFetch('/api/health'),

  // Customers
  getCustomers: () => apiFetch('/api/customers'),
  getCustomer: (id: string) => apiFetch(`/api/customers/${id}`),

  // Orders
  getOrders: () => apiFetch('/api/orders'),
  getOrder: (id: string) => apiFetch(`/api/orders/${id}`),

  // Inventory
  getInventory: () => apiFetch('/api/inventory'),

  // Policies
  getPolicies: () => apiFetch('/api/policies'),
  createPolicy: (data: Record<string, unknown>) =>
    apiFetch('/api/policies', { method: 'POST', body: JSON.stringify(data) }),
  updatePolicy: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePolicy: (id: string) => apiFetch(`/api/policies/${id}`, { method: 'DELETE' }),

  // CSV Imports
  uploadCsv: (type: 'customers' | 'orders' | 'inventory' | 'policies', file: File) =>
    apiUpload(`/api/import/${type}`, file),

  // Cases
  getCases: () => apiFetch('/api/cases'),
  getCase: (id: string) => apiFetch(`/api/cases/${id}`),
  createCase: (data: { customer_id: string; order_id: string; customer_message: string; demo_mode?: boolean }) =>
    apiFetch('/api/cases', { method: 'POST', body: JSON.stringify(data) }),
  resolveCase: (id: string) =>
    apiFetch(`/api/cases/${id}/resolve`, { method: 'POST' }),
  resetCase: (id: string) =>
    apiFetch(`/api/cases/${id}/reset`, { method: 'POST' }),

  // Events (polling with backoff support)
  getCaseEvents: (id: string, since?: string) =>
    apiFetch(`/api/cases/${id}/events${since ? `?since=${encodeURIComponent(since)}` : ''}`),

  // Analytics
  getAnalytics: () => apiFetch('/api/analytics'),

  // Demo state reset
  resetDemo: () => apiFetch('/api/demo/reset', { method: 'POST' }),
  runDemo: () => apiFetch('/api/demo/run', { method: 'POST' }),

  // Post-resolution action execution
  executeAction: (caseId: string, actionType: string, options?: Record<string, unknown>) =>
    apiFetch(`/api/cases/${caseId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action_type: actionType, ...options }),
    }),

  // ─── ResolveAI 2.0: Customer Lifecycle & Memory ────────────────────────
  getCustomerMemory: (customerId: string) => apiFetch(`/api/customers/${customerId}/memory`),
  deferCustomerFeedback: (customerId: string, orderId: string, days = 3) =>
    apiFetch(`/api/customers/${customerId}/feedback/defer`, {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, days_deferral: days }),
    }),
  getOrderTimeline: (orderId: string) => apiFetch(`/api/orders/${orderId}/timeline`),
  transitionOrderLifecycle: (orderId: string, data: { new_state: string; actor?: string; reason?: string; metadata?: any }) =>
    apiFetch(`/api/orders/${orderId}/lifecycle`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getShipment: (orderId: string) => apiFetch(`/api/shipments/${orderId}`),
  updateShipmentCheckpoint: (shipmentId: string, data: { status: string; current_location: string; is_delayed?: boolean; delay_reason?: string; carrier?: string }) =>
    apiFetch(`/api/shipments/${shipmentId}/checkpoint`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProactiveAlerts: () => apiFetch('/api/proactive/alerts'),

  // ─── Risk-Adaptive Approvals ───────────────────────────────────────────
  getPendingActions: () => apiFetch('/api/actions/pending'),
  approveAction: (actionId: string, approvedBy = 'supervisor') =>
    apiFetch(`/api/actions/${actionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: approvedBy }),
    }),
  rejectAction: (actionId: string, reason = 'Rejected by supervisor') =>
    apiFetch(`/api/actions/${actionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // ─── Hackathon Demo Simulator ──────────────────────────────────────────
  runSimulator: () => apiFetch('/api/simulator/run', { method: 'POST' }),
  resetSimulator: () => apiFetch('/api/simulator/reset', { method: 'POST' }),
  getSimulatorStatus: () => apiFetch('/api/simulator/status'),

  // Voice Neural TTS
  getVoices: () => apiFetch('/api/chutku/voices'),
  generateTts: (payload: { text: string; voice_id?: string; rate?: string }): Promise<Response> => {
    const base = getApiBase()
    return fetch(`${base}/api/chutku/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  // Legacy / Direct chat stream returning raw Response
  chatStream: (message: string, caseId?: string): Promise<Response> => {
    const base = getApiBase()
    return fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, case_id: caseId }),
    })
  },

  // SSE Chat Streaming for Chutku Assistant with Persistent Memory Support
  streamChat: async (
    message: string,
    callbacks: {
      onToken: (token: string) => void
      onError?: (error: string) => void
      onDone?: () => void
    },
    context?: string | { caseId?: string; customerId?: string; conversationId?: string; orderId?: string }
  ): Promise<void> => {
    const base = getApiBase()
    const url = `${base}/api/chat`
    const ctx = typeof context === 'string' ? { caseId: context } : context || {}
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          case_id: ctx.caseId,
          customer_id: ctx.customerId,
          conversation_id: ctx.conversationId,
          order_id: ctx.orderId,
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`Chat stream error (${res.status}): ${errText || 'Service unavailable'}`)
      }

      if (!res.body) {
        throw new Error('No response body returned from chat stream.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') {
            callbacks.onDone?.()
            return
          }
          try {
            const data = JSON.parse(payload)
            if (data.token) callbacks.onToken(data.token)
            if (data.done) callbacks.onDone?.()
            if (data.error) callbacks.onError?.(data.error)
          } catch {
            // Non-JSON string token fallback
            if (payload) callbacks.onToken(payload)
          }
        }
      }
      callbacks.onDone?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete chat request'
      callbacks.onError?.(msg)
    }
  },
}

export type CaseDetail = {
  id: string
  customer_id: string
  customer?: { id: string; name?: string; email?: string; tier?: string; [key: string]: any } | null
  order_id: string
  order?: { id: string; item_name?: string; tracking_number?: string; delivery_status?: string; status?: string; issue_type?: string; total_amount?: number; [key: string]: any } | null
  product?: { id: string; name?: string; price?: number; sku?: string; [key: string]: any } | null
  customer_message: string
  status: string
  resolution_summary?: string | null
  replacement?: { id: string; tracking_number?: string; status?: string; warehouse_allocated?: string; warehouse?: string; [key: string]: any } | null
  inventory?: any[]
  created_at: string
  updated_at: string
  [key: string]: any
}

export type AgentEvent = {
  id: string
  case_id: string
  sequence_number: number
  event_type: string
  tool_name?: string | null
  status?: string | null
  reasoning_summary?: string | null
  input_data?: Record<string, unknown> | null
  output_data?: Record<string, unknown> | null
  timestamp: string
}
