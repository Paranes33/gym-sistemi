import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('Unfreezing membership:', id)

    // Üyeliği bul
    const membership = await db.membership.findUnique({
      where: { id },
      include: {
        freezes: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1
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
    if (membership.freezes.length > 0) {
      await db.freezePeriod.updateMany({
        where: {
          membershipId: id,
          isActive: true
        },
        data: {
          isActive: false,
          endDate: new Date()
        }
      })
    }

    // Üyeliği aktif yap
    const updated = await db.membership.update({
      where: { id },
      data: {
        status: 'ACTIVE'
      },
      include: {
        member: {
          include: { user: true }
        }
      }
    })

    console.log('Membership unfrozen:', updated.id)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Unfreeze error:', error)
    return NextResponse.json({ 
      error: 'Sunucu hatası',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 })
  }
}
