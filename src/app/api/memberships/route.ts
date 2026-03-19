import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const gymId = searchParams.get('gymId')

    const where: any = {}
    if (memberId) where.memberId = memberId
    if (gymId) where.gymId = gymId

    const memberships = await db.membership.findMany({
      where,
      include: {
        member: {
          include: { user: true }
        },
        gym: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate remaining days for each membership
    const result = memberships.map(m => ({
      ...m,
      remainingDays: Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get memberships error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, startDate, durationDays, price, paidAmount, notes } = body

    if (!memberId || !startDate || !durationDays) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 })
    }

    const member = await db.member.findUnique({
      where: { id: memberId }
    })

    if (!member) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + durationDays)

    const membership = await db.membership.create({
      data: {
        memberId,
        gymId: member.gymId,
        startDate: start,
        endDate: end,
        durationDays,
        price: price || 0,
        paidAmount: paidAmount || 0,
        notes,
        status: 'ACTIVE'
      },
      include: {
        member: { include: { user: true } }
      }
    })

    // Create debt if paid amount is less than price
    if (paidAmount < price) {
      const debt = price - paidAmount
      await db.debt.create({
        data: {
          memberId,
          amount: debt,
          description: `Üyelik borcu - ${durationDays} gün`
        }
      })
    }

    // Create payment record if paid
    if (paidAmount > 0) {
      await db.payment.create({
        data: {
          memberId,
          gymId: member.gymId,
          userId: 'system',
          membershipId: membership.id,
          amount: paidAmount,
          type: 'CASH',
          description: 'Üyelik ödemesi'
        }
      })
    }

    return NextResponse.json(membership)
  } catch (error) {
    console.error('Create membership error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
