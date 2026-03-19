import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Geçerli bir tutar girin' }, { status: 400 })
    }

    const debt = await db.debt.findUnique({
      where: { id },
      include: { member: true }
    })

    if (!debt) {
      return NextResponse.json({ error: 'Borç bulunamadı' }, { status: 404 })
    }

    if (debt.isPaid) {
      return NextResponse.json({ error: 'Bu borç zaten ödenmiş' }, { status: 400 })
    }

    // Sistem kullanıcısı var mı kontrol et
    let systemUser = await db.user.findFirst({
      where: { email: 'system@gym.local' }
    })

    if (!systemUser) {
      systemUser = await db.user.create({
        data: {
          email: 'system@gym.local',
          password: 'system',
          name: 'Sistem',
          role: 'SALON_ADMIN'
        }
      })
    }

    const result = await db.$transaction(async (tx) => {
      // Ödeme kaydı oluştur
      await tx.payment.create({
        data: {
          memberId: debt.memberId,
          gymId: debt.member.gymId,
          userId: systemUser.id,
          debtId: id,
          amount,
          type: 'CASH',
          description: `Borç ödemesi - ${debt.description}`
        }
      })

      // Borcu güncelle
      const remainingDebt = debt.amount - amount
      
      const updatedDebt = await tx.debt.update({
        where: { id },
        data: {
          amount: remainingDebt > 0 ? remainingDebt : 0,
          isPaid: remainingDebt <= 0,
          paidAt: remainingDebt <= 0 ? new Date() : undefined
        },
        include: {
          member: { include: { user: true } }
        }
      })

      return updatedDebt
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Pay debt error:', error)
    return NextResponse.json({ 
      error: 'Server error: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') 
    }, { status: 500 })
  }
}
