import type { 
  User, Gym, Member, Membership, Debt, Payment, EntryLog, 
  DashboardStats, MemberFilter, PaginatedResponse 
} from '@/types'

const API_BASE = '/api'

// Helper function for API calls
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || 'API call failed')
  }

  return response.json()
}

// ============ AUTH API ============
export const authApi = {
  login: (email: string, password: string) => 
    apiCall<{ user: User; token: string; member?: Member; gym?: Gym }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  logout: () => 
    apiCall<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  me: () => 
    apiCall<{ user: User; member?: Member; gym?: Gym }>('/auth/me'),

  updatePassword: (currentPassword: string, newPassword: string) =>
    apiCall<{ success: boolean }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    })
}

// ============ GYMS API ============
export const gymsApi = {
  list: () => 
    apiCall<Gym[]>('/gyms'),

  get: (id: string) => 
    apiCall<Gym>(`/gyms/${id}`),

  create: (data: Partial<Gym>) => 
    apiCall<Gym>('/gyms', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: Partial<Gym>) => 
    apiCall<Gym>(`/gyms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) => 
    apiCall<{ success: boolean }>(`/gyms/${id}`, { method: 'DELETE' }),

  stats: (id: string) => 
    apiCall<DashboardStats>(`/gyms/${id}/stats`)
}

// ============ MEMBERS API ============
export const membersApi = {
  list: (filter?: MemberFilter, page = 1, pageSize = 20) => 
    apiCall<PaginatedResponse<Member>>(`/members?${new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(filter?.status && { status: filter.status }),
      ...(filter?.hasDebt !== undefined && { hasDebt: String(filter.hasDebt) }),
      ...(filter?.gymId && { gymId: filter.gymId }),
      ...(filter?.search && { search: filter.search }),
      ...(filter?.expiringDays && { expiringDays: String(filter.expiringDays) })
    })}`),

  get: (id: string) => 
    apiCall<Member>(`/members/${id}`),

  create: (data: Partial<Member> & { password: string }) => 
    apiCall<Member>('/members', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: Partial<Member>) => 
    apiCall<Member>(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) => 
    apiCall<{ success: boolean }>(`/members/${id}`, { method: 'DELETE' }),

  findByCard: (cardId: string) => 
    apiCall<Member>(`/members/card/${cardId}`),

  checkEntry: (cardId: string) => 
    apiCall<{ allowed: boolean; member?: Member; reason?: string }>(`/members/check-entry/${cardId}`)
}

// ============ MEMBERSHIPS API ============
export const membershipsApi = {
  list: (memberId?: string) => 
    apiCall<Membership[]>(`/memberships${memberId ? `?memberId=${memberId}` : ''}`),

  get: (id: string) => 
    apiCall<Membership>(`/memberships/${id}`),

  create: (data: Partial<Membership> & { memberId: string }) => 
    apiCall<Membership>('/memberships', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  extend: (id: string, days: number) => 
    apiCall<Membership>(`/memberships/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days })
    }),

  freeze: (id: string, startDate: string, endDate: string, reason?: string) => 
    apiCall<Membership>(`/memberships/${id}/freeze`, {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate, reason })
    }),

  unfreeze: (id: string) => 
    apiCall<Membership>(`/memberships/${id}/unfreeze`, { method: 'POST' }),

  updateStatus: (id: string, status: string) => 
    apiCall<Membership>(`/memberships/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
}

// ============ DEBTS API ============
export const debtsApi = {
  list: (memberId?: string, unpaidOnly = false) => 
    apiCall<Debt[]>(`/debts?${new URLSearchParams({
      ...(memberId && { memberId }),
      ...(unpaidOnly && { unpaidOnly: 'true' })
    })}`),

  create: (data: Partial<Debt> & { memberId: string; amount: number; description: string }) => 
    apiCall<Debt>('/debts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: Partial<Debt>) => 
    apiCall<Debt>(`/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) => 
    apiCall<{ success: boolean }>(`/debts/${id}`, { method: 'DELETE' }),

  markPaid: (id: string) => 
    apiCall<Debt>(`/debts/${id}/pay`, { method: 'POST' })
}

// ============ PAYMENTS API ============
export const paymentsApi = {
  list: (memberId?: string, gymId?: string) => 
    apiCall<Payment[]>(`/payments?${new URLSearchParams({
      ...(memberId && { memberId }),
      ...(gymId && { gymId })
    })}`),

  create: (data: Partial<Payment> & { memberId: string; amount: number }) => 
    apiCall<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getStats: (gymId?: string) => 
    apiCall<{ today: number; month: number; year: number }>(`/payments/stats?${gymId ? `gymId=${gymId}` : ''}`)
}

// ============ ENTRY LOGS API ============
export const entryLogsApi = {
  list: (gymId?: string, memberId?: string) => 
    apiCall<EntryLog[]>(`/entry-logs?${new URLSearchParams({
      ...(gymId && { gymId }),
      ...(memberId && { memberId })
    })}`),

  create: (cardId: string, gymId: string) => 
    apiCall<EntryLog>('/entry-logs', {
      method: 'POST',
      body: JSON.stringify({ cardId, gymId })
    }),

  recordExit: (id: string) => 
    apiCall<EntryLog>(`/entry-logs/${id}/exit`, { method: 'POST' }),

  getStats: (gymId?: string) => 
    apiCall<{ today: number; peakHours: { hour: number; count: number }[] }>(`/entry-logs/stats?${gymId ? `gymId=${gymId}` : ''}`)
}

// ============ DASHBOARD API ============
export const dashboardApi = {
  getStats: (gymId?: string) => 
    apiCall<DashboardStats>(`/dashboard/stats?${gymId ? `gymId=${gymId}` : ''}`)
}
