import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gymId')

    const memberWhere = gymId ? { gymId } : {}
    const paymentWhere = gymId ? { gymId } : {}
    const entryWhere = gymId ? { gymId } : {}

    // Get counts
    const [
      totalMembers,
      activeMemberships,
      expiredMemberships,
      frozenMemberships,
      unpaidDebts,
      todayPayments,
      monthPayments,
      todayEntries,
      recentEntries,
      expiringMembers
    ] = await Promise.all([
      // Total members
      db.member.count({ where: memberWhere }),
      
      // Active memberships
      db.membership.count({
        where: { status: 'ACTIVE', ...(gymId ? { gymId } : {}) }
      }),
      
      // Expired memberships
      db.membership.count({
        where: { status: 'EXPIRED', ...(gymId ? { gymId } : {}) }
      }),
      
      // Frozen memberships
      db.membership.count({
        where: { status: 'FROZEN', ...(gymId ? { gymId } : {}) }
      }),
      
      // Total unpaid debts
      db.debt.aggregate({
        where: { isPaid: false, member: memberWhere },
        _sum: { amount: true }
      }),
      
      // Today's income
      db.payment.aggregate({
        where: {
          ...paymentWhere,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        _sum: { amount: true }
      }),
      
      // This month's income
      db.payment.aggregate({
        where: {
          ...paymentWhere,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { amount: true }
      }),
      
      // Today's entries
      db.entryLog.count({
        where: {
          ...entryWhere,
          entryTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Recent entries
      db.entryLog.findMany({
        where: entryWhere,
        include: {
          member: { include: { user: true } }
        },
        orderBy: { entryTime: 'desc' },
        take: 5
      }),
      
      // Members expiring in next 7 days
      db.membership.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          ...(gymId ? { gymId } : {})
        },
        include: {
          member: { include: { user: true } }
        },
        take: 10
      })
    ])

    const stats = {
      totalMembers,
      activeMembers: activeMemberships,
      expiredMembers: expiredMemberships,
      frozenMembers: frozenMemberships,
      totalDebts: unpaidDebts._sum.amount || 0,
      todayIncome: todayPayments._sum.amount || 0,
      monthIncome: monthPayments._sum.amount || 0,
      todayEntries,
      pendingPayments: 0
    }

    const recentEntriesFormatted = recentEntries.map(e => ({
      id: e.id,
      memberName: e.member?.user?.name || 'Bilinmiyor',
      entryTime: e.entryTime,
      status: e.status
    }))

    const expiringMembersFormatted = expiringMembers.map(m => ({
      id: m.id,
      name: m.member?.user?.name || 'Bilinmiyor',
      endDate: m.endDate,
      remainingDays: Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }))

    return NextResponse.json({
      stats,
      recentEntries: recentEntriesFormatted,
      expiringMembers: expiringMembersFormatted
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
