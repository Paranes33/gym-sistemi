import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { decodeToken } from '../login/route'

export async function GET(request: NextRequest) {
  try {
    // Get token from header or cookie
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = decodeToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const totalDebt = user.member?.debts?.reduce((sum, d) => sum + d.amount, 0) || 0

    return NextResponse.json({
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
      member: user.member ? {
        ...user.member,
        totalDebt,
        activeMembership: user.member.memberships?.[0] || null
      } : null,
      gym: user.managedGym || user.member?.gym || null
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
