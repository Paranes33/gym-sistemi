import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const gymId = searchParams.get('gymId')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Daily income
    const payments = await db.payment.findMany({
      where: {
        createdAt: { gte: startDate },
        ...(gymId ? { gymId } : {})
      },
      select: { amount: true, createdAt: true }
    })

    const dailyIncome: { date: string; amount: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      
      const dayPayments = payments.filter(p => 
        new Date(p.createdAt) >= date && new Date(p.createdAt) < nextDate
      )
      
      dailyIncome.push({
        date: date.toISOString(),
        amount: dayPayments.reduce((sum, p) => sum + p.amount, 0)
      })
    }

    // Member stats
    const [active, expired, frozen, inactive] = await Promise.all([
      db.membership.count({ where: { status: 'ACTIVE', ...(gymId ? { gymId } : {}) } }),
      db.membership.count({ where: { status: 'EXPIRED', ...(gymId ? { gymId } : {}) } }),
      db.membership.count({ where: { status: 'FROZEN', ...(gymId ? { gymId } : {}) } }),
      db.member.count({ 
        where: { 
          ...(gymId ? { gymId } : {}),
          memberships: { none: {} }
        } 
      })
    ])

    const memberStats = { active, expired, frozen, inactive }

    // Entry stats by hour (mock data for now as entry logs might not have enough data)
    const entryLogs = await db.entryLog.findMany({
      where: {
        entryTime: { gte: startDate },
        ...(gymId ? { gymId } : {})
      },
      select: { entryTime: true }
    })

    const hourCounts: Record<number, number> = {}
    for (let h = 6; h <= 22; h++) {
      hourCounts[h] = 0
    }

    entryLogs.forEach(log => {
      const hour = new Date(log.entryTime).getHours()
      if (hour >= 6 && hour <= 22) {
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      }
    })

    const entryStats = Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      count
    }))

    return NextResponse.json({
      dailyIncome,
      memberStats,
      entryStats,
      monthlyIncome: [],
      topMembers: []
    })
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
