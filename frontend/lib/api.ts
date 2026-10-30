/**
 * API client for ResolveAI backend.
 */

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('resolveai_api_url')
      if (custom) return custom.replace(/\/$/, '')
    } catch {}
    if (window.location.protocol === 'https:') {
      if (window.location.hostname.includes('resolveai-frontend') && window.location.hostname.endsWith('.onrender.com')) {
        return 'https://resolveai-backend.onrender.com'
      }
      return ''
    }
  }
  return 'http://127.0.0.1:8000'
}

async function apiFetch(path: string, options?: RequestInit) {
  const base = getApiBase()
  const url = `${base}${path}`
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const errorBody = await res.text()
      throw new Error(`API ${res.status}: ${errorBody}`)
    }
    return res.json()
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'server'
      throw new Error(`Unable to connect to backend API at ${base || origin}. Ensure the backend service is running.`)
    }
    throw err
  }
}

async function apiUpload(path: string, file: File) {
  const base = getApiBase()
  const url = `${base}${path}`
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const errorBody = await res.text()
      throw new Error(`API ${res.status}: ${errorBody}`)
    }
    return res.json()
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'server'
      throw new Error(`Unable to connect to backend API at ${base || origin}. Ensure the backend service is running.`)
    }
    throw err
  }
}

export const api = {
  // Health
  health: () => apiFetch('/api/health'),

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
  createPolicy: (data: Record<string, unknown>) => apiFetch('/api/policies', { method: 'POST', body: JSON.stringify(data) }),
  updatePolicy: (id: string, data: Record<string, unknown>) => apiFetch(`/api/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePolicy: (id: string) => apiFetch(`/api/policies/${id}`, { method: 'DELETE' }),

  // Imports
  uploadCsv: (type: 'customers' | 'orders' | 'inventory' | 'policies', file: File) => 
    apiUpload(`/api/import/${type}`, file),

  // Cases
  getCases: () => apiFetch('/api/cases'),
  getCase: (id: string) => apiFetch(`/api/cases/${id}`),
  createCase: (data: { customer_id: string; order_id: string; customer_message: string; demo_mode?: boolean }) =>
    apiFetch('/api/cases', { method: 'POST', body: JSON.stringify(data) }),
  resolveCase: (id: string) =>
    apiFetch(`/api/cases/${id}/resolve`, { method: 'POST' }),

  // Events (polling)
  getCaseEvents: (id: string, since?: string) =>
    apiFetch(`/api/cases/${id}/events${since ? `?since=${encodeURIComponent(since)}` : ''}`),

  // Analytics
  getAnalytics: () => apiFetch('/api/analytics'),

  // Demo
  resetDemo: () => apiFetch('/api/demo/reset', { method: 'POST' }),
  runDemo: () => apiFetch('/api/demo/run', { method: 'POST' }),

  // Chat (SSE streaming) - returns raw Response for caller to handle SSE
  chatStream: (message: string, caseId?: string): Promise<Response> => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, case_id: caseId }),
    })
  },

  // Execute a post-resolution action
  executeAction: (caseId: string, actionType: string, options?: Record<string, unknown>) =>
    apiFetch(`/api/cases/${caseId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action_type: actionType, ...options }),
    }),
}

export type CaseDetail = {
  id: string
  customer_id: string
  customer: { id: string; name: string; email: string; tier: string } | null
  order_id: string
  order: { id: string; status: string; delivery_date: string | null; issue_type: string | null; total_amount: number } | null
  product: { id: string; name: string; sku: string } | null
  customer_message: string
  status: string
  resolution_summary: string | null
  demo_conflict_pending: boolean
  replacement: {
    id: string; warehouse: string; status: string; tracking_number: string; created_at: string
  } | null
  inventory: { warehouse: string; quantity: number; reserved_quantity: number; available: number; updated_at: string }[]
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export type AgentEvent = {
  id: string
  case_id: string
  execution_id: string | null
  timestamp: string
  tool_name: string | null
  event_type: string
  status: string
  reasoning_summary: string
  input_data: Record<string, unknown> | null
  output_data: Record<string, unknown> | null
  sequence_number: number
}
