import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Simple in-memory session store (in production use Redis or database)
const sessions = new Map<string, { userId: string; expiresAt: number }>()

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre gerekli' }, { status: 400 })
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
      include: {
        member: {
          include: {
            gym: true,
            memberships: {
              where: { status: 'ACTIVE' },
              orderBy: { endDate: 'desc' },
              take: 1
            },
            debts: {
              where: { isPaid: false }
            }
          }
        },
        managedGym: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 401 })
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Hatalı şifre' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Hesap devre dışı' }, { status: 401 })
    }

    // Create session token
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })

    // Calculate total debt
    const totalDebt = user.member?.debts?.reduce((sum, d) => sum + d.amount, 0) || 0

    // Format response
    const response = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        image: user.image,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token,
      member: user.member ? {
        ...user.member,
        totalDebt,
        activeMembership: user.member.memberships?.[0] || null
      } : null,
      gym: user.managedGym || (user.member?.gym) || null
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export { sessions }
