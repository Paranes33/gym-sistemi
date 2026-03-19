// Kullanıcı rolleri
export type UserRole = 'SUPER_ADMIN' | 'SALON_ADMIN' | 'MEMBER'

// Üyelik durumu
export type MembershipStatus = 'ACTIVE' | 'INACTIVE' | 'FROZEN' | 'EXPIRED'

// Ödeme türü
export type PaymentType = 'CASH' | 'CARD' | 'ONLINE'

// Giriş durumu
export type EntryStatus = 'ALLOWED' | 'DENIED_EXPIRED' | 'DENIED_FROZEN' | 'DENIED_DEBT' | 'DENIED_INACTIVE'

// Kullanıcı
export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: UserRole
  image?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Spor Salonu
export interface Gym {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  adminId?: string
  admin?: User
  memberCount?: number
  activeMemberCount?: number
}

// Üye
export interface Member {
  id: string
  userId: string
  user: User
  gymId: string
  gym?: Gym
  cardId?: string
  qrCode?: string
  birthDate?: string
  gender?: string
  emergencyContact?: string
  notes?: string
  createdAt: string
  updatedAt: string
  memberships?: Membership[]
  debts?: Debt[]
  activeMembership?: Membership
  totalDebt?: number
}

// Üyelik
export interface Membership {
  id: string
  memberId: string
  member?: Member
  gymId: string
  gym?: Gym
  startDate: string
  endDate: string
  durationDays: number
  status: MembershipStatus
  price: number
  paidAmount: number
  notes?: string
  createdAt: string
  updatedAt: string
  remainingDays?: number
}

// Dondurma
export interface FreezePeriod {
  id: string
  membershipId: string
  membership?: Membership
  memberId: string
  member?: Member
  startDate: string
  endDate: string
  extendedDays: number
  reason?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Borç
export interface Debt {
  id: string
  memberId: string
  member?: Member
  amount: number
  description: string
  dueDate?: string
  isPaid: boolean
  paidAt?: string
  createdAt: string
  updatedAt: string
}

// Ödeme
export interface Payment {
  id: string
  amount: number
  type: PaymentType
  description?: string
  memberId: string
  member?: Member
  gymId: string
  gym?: Gym
  userId: string
  user?: User
  membershipId?: string
  membership?: Membership
  debtId?: string
  debt?: Debt
  receiptNo?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Giriş Logu
export interface EntryLog {
  id: string
  memberId?: string
  member?: Member
  userId?: string
  user?: User
  gymId: string
  gym?: Gym
  cardId?: string
  status: EntryStatus
  denialReason?: string
  entryTime: string
  exitTime?: string
  notes?: string
  createdAt: string
}

// Dashboard İstatistikleri
export interface DashboardStats {
  totalMembers: number
  activeMembers: number
  expiredMembers: number
  frozenMembers: number
  totalDebts: number
  todayIncome: number
  monthIncome: number
  todayEntries: number
  pendingPayments: number
}

// Filtre Seçenekleri
export interface MemberFilter {
  status?: MembershipStatus | 'ALL'
  hasDebt?: boolean
  gymId?: string
  search?: string
  expiringDays?: number
}

// Sayfalama
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
