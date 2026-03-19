import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessions } from '@/app/api/auth/login/route'

export async function GET(request: NextRequest) {
  try {
    // Get token from header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = sessions.get(token)
    if (!session || session.expiresAt < Date.now()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const member = await db.member.findFirst({
      where: { userId: session.userId },
      include: {
        user: true,
        memberships: {
          orderBy: { endDate: 'desc' },
          take: 1
        },
        debts: {
          where: { isPaid: false }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Get entry logs
    const entryLogs = await db.entryLog.findMany({
      where: { memberId: member.id },
      orderBy: { entryTime: 'desc' },
      take: 20
    })

    const totalDebt = member.debts.reduce((sum, d) => sum + d.amount, 0)
    const activeMembership = member.memberships[0]

    return NextResponse.json({
      member: {
        ...member,
        totalDebt,
        activeMembership
      },
      payments: member.payments,
      entryLogs
    })
  } catch (error) {
    console.error('Member me error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
