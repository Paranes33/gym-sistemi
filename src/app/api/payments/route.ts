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

    const payments = await db.payment.findMany({
      where,
      include: {
        member: {
          include: { 
            user: {
              select: { id: true, name: true, email: true, phone: true }
            }
          }
        },
        gym: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, amount, type, description, gymId, debtId } = body

    if (!memberId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Eksik veya geçersiz bilgi' }, { status: 400 })
    }

    const member = await db.member.findUnique({
      where: { id: memberId }
    })

    if (!member) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    // Sistem kullanıcısı var mı kontrol et, yoksa oluştur
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

    const payment = await db.payment.create({
      data: {
        memberId,
        gymId: gymId || member.gymId,
        userId: systemUser.id,
        amount,
        type: type || 'CASH',
        description,
        debtId
      },
      include: {
        member: { include: { user: true } }
      }
    })

    // If paying a debt, update it
    if (debtId) {
      const debt = await db.debt.findUnique({ where: { id: debtId } })
      if (debt) {
        if (amount >= debt.amount) {
          await db.debt.update({
            where: { id: debtId },
            data: { isPaid: true, paidAt: new Date(), amount: 0 }
          })
        } else {
          await db.debt.update({
            where: { id: debtId },
            data: { amount: debt.amount - amount }
          })
        }
      }
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
