import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { days } = await request.json()

    if (!days || days <= 0) {
      return NextResponse.json({ error: 'Geçerli bir gün sayısı girin' }, { status: 400 })
    }

    const membership = await db.membership.findUnique({
      where: { id }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Üyelik bulunamadı' }, { status: 404 })
    }

    const newEndDate = new Date(membership.endDate)
    newEndDate.setDate(newEndDate.getDate() + days)

    const updated = await db.membership.update({
      where: { id },
      data: {
        endDate: newEndDate,
        durationDays: membership.durationDays + days,
        status: 'ACTIVE'
      },
      include: {
        member: { include: { user: true } }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Extend membership error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
