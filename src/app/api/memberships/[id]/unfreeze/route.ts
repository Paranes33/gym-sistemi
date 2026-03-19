import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: membershipId } = await params

    console.log('Unfreezing membership:', membershipId)

    // Üyeliği bul
    const membership = await db.membership.findUnique({
      where: { id: membershipId },
      include: {
        freezes: {
          where: { isActive: true }
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Üyelik bulunamadı' }, { status: 404 })
    }

    if (membership.status !== 'FROZEN') {
      return NextResponse.json({ error: 'Bu üyelik dondurulmuş değil' }, { status: 400 })
    }

    // Aktif dondurma dönemlerini kapat
    await db.freezePeriod.updateMany({
      where: {
        membershipId: membershipId,
        isActive: true
      },
      data: {
        isActive: false,
        endDate: new Date()
      }
    })

    // Üyeliği aktif yap
    const updated = await db.membership.update({
      where: { id: membershipId },
      data: {
        status: 'ACTIVE'
      },
      include: {
        member: {
          include: {
            user: true
          }
        }
      }
    })

    console.log('Membership unfrozen:', updated.id)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Unfreeze membership error:', error)
    return NextResponse.json({ 
      error: 'Server error: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') 
    }, { status: 500 })
  }
}
