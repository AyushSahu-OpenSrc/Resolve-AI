/**
 * API client for ResolveAI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_BASE}${path}`
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
