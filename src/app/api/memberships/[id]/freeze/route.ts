import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { startDate, endDate, reason } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Tarihleri seçin' }, { status: 400 })
    }

    const membership = await db.membership.findUnique({
      where: { id }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Üyelik bulunamadı' }, { status: 404 })
    }

    const freezeStart = new Date(startDate)
    const freezeEnd = new Date(endDate)
    const freezeDays = Math.ceil((freezeEnd.getTime() - freezeStart.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate extended days (same as freeze period)
    const newEndDate = new Date(membership.endDate)
    newEndDate.setDate(newEndDate.getDate() + freezeDays)

    const result = await db.$transaction(async (tx) => {
      // Create freeze record
      await tx.freezePeriod.create({
        data: {
          membershipId: id,
          memberId: membership.memberId,
          startDate: freezeStart,
          endDate: freezeEnd,
          extendedDays: freezeDays,
          reason
        }
      })

      // Update membership
      return await tx.membership.update({
        where: { id },
        data: {
          status: 'FROZEN',
          endDate: newEndDate
        },
        include: {
          member: { include: { user: true } }
        }
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Freeze membership error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
