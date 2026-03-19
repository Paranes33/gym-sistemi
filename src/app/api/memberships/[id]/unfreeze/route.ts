import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const membership = await db.membership.findUnique({
      where: { id }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Üyelik bulunamadı' }, { status: 404 })
    }

    if (membership.status !== 'FROZEN') {
      return NextResponse.json({ error: 'Üyelik dondurulmuş değil' }, { status: 400 })
    }

    // Deactivate active freeze periods
    await db.freezePeriod.updateMany({
      where: {
        membershipId: id,
        isActive: true
      },
      data: { isActive: false }
    })

    const updated = await db.membership.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: {
        member: { include: { user: true } }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Unfreeze membership error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
