import { cookies } from 'next/headers'
import { db } from './db'
import { UserRole, User, Member, Gym } from '@/types'
import bcrypt from 'bcryptjs'

// Simple session store (in-memory for demo - use Redis in production)
const sessions = new Map<string, { userId: string; expiresAt: number }>()

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  phone?: string | null
  image?: string | null
  isActive: boolean
  gymId?: string | null
  gym?: Gym | null
  member?: Member | null
}

// Generate a simple token
function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Create session
export async function createSession(userId: string): Promise<string> {
  const token = generateToken()
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + SESSION_DURATION
  })
  return token
}

// Get session from cookie
export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  
  if (!token) return null
  
  const session = sessions.get(token)
  if (!session) return null
  
  // Check expiration
  if (Date.now() > session.expiresAt) {
    sessions.delete(token)
    return null
  }
  
  return { userId: session.userId }
}

// Get current user
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession()
  if (!session) return null
  
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      member: {
        include: {
          gym: true,
          memberships: {
            where: { status: 'ACTIVE' },
            orderBy: { endDate: 'desc' },
            take: 1
          }
        }
      },
      managedGym: true
    }
  })
  
  if (!user || !user.isActive) return null
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    phone: user.phone,
    image: user.image,
    isActive: user.isActive,
    gymId: user.member?.gymId || user.managedGym?.id || null,
    gym: user.managedGym || user.member?.gym || null,
    member: user.member ? {
      id: user.member.id,
      userId: user.member.userId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || undefined,
        role: user.role as UserRole,
        image: user.image || undefined,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      },
      gymId: user.member.gymId,
      gym: user.member.gym ? {
        id: user.member.gym.id,
        name: user.member.gym.name,
        address: user.member.gym.address || undefined,
        phone: user.member.gym.phone || undefined,
        email: user.member.gym.email || undefined,
        isActive: user.member.gym.isActive,
        createdAt: user.member.gym.createdAt.toISOString(),
        updatedAt: user.member.gym.updatedAt.toISOString(),
        adminId: user.member.gym.adminId || undefined
      } : undefined,
      cardId: user.member.cardId || undefined,
      qrCode: user.member.qrCode || undefined,
      birthDate: user.member.birthDate?.toISOString(),
      gender: user.member.gender || undefined,
      emergencyContact: user.member.emergencyContact || undefined,
      notes: user.member.notes || undefined,
      createdAt: user.member.createdAt.toISOString(),
      updatedAt: user.member.updatedAt.toISOString(),
      activeMembership: user.member.memberships[0] ? {
        id: user.member.memberships[0].id,
        memberId: user.member.memberships[0].memberId,
        gymId: user.member.memberships[0].gymId,
        startDate: user.member.memberships[0].startDate.toISOString(),
        endDate: user.member.memberships[0].endDate.toISOString(),
        durationDays: user.member.memberships[0].durationDays,
        status: user.member.memberships[0].status as any,
        price: user.member.memberships[0].price,
        paidAmount: user.member.memberships[0].paidAmount,
        notes: user.member.memberships[0].notes || undefined,
        createdAt: user.member.memberships[0].createdAt.toISOString(),
        updatedAt: user.member.memberships[0].updatedAt.toISOString()
      } : undefined
    } : null
  }
}

// Destroy session
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  
  if (token) {
    sessions.delete(token)
  }
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Check if user has permission
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole)
}

// API response helpers
export function apiResponse<T>(data: T, status = 200) {
  return Response.json(data, { status })
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export function unauthorizedError() {
  return apiError('Unauthorized', 401)
}

export function forbiddenError() {
  return apiError('Forbidden', 403)
}

export function notFoundError(message = 'Not found') {
  return apiError(message, 404)
}
