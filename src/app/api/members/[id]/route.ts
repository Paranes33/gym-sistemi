import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const member = await db.member.findUnique({
      where: { id },
      include: {
        user: true,
        gym: true,
        memberships: {
          orderBy: { createdAt: 'desc' }
        },
        debts: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    const totalDebt = member.debts.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0)
    const activeMembership = member.memberships.find(m => m.status === 'ACTIVE')

    return NextResponse.json({
      ...member,
      totalDebt,
      activeMembership
    })
  } catch (error) {
    console.error('Get member error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, phone, cardId, gender, birthDate, emergencyContact, notes, password } = body

    const existingMember = await db.member.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!existingMember) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    // Check cardId uniqueness
    if (cardId && cardId !== existingMember.cardId) {
      const existingCard = await db.member.findUnique({ where: { cardId } })
      if (existingCard) {
        return NextResponse.json({ error: 'Bu kart ID zaten kullanılıyor' }, { status: 400 })
      }
    }

    // Check email uniqueness
    if (email && email !== existingMember.user.email) {
      const existingEmail = await db.user.findUnique({ where: { email } })
      if (existingEmail) {
        return NextResponse.json({ error: 'Bu e-posta zaten kullanılıyor' }, { status: 400 })
      }
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
      const updateData: any = {}
      if (name) updateData.name = name
      if (email) updateData.email = email
      if (phone !== undefined) updateData.phone = phone

      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id: existingMember.userId },
          data: updateData
        })
      }

      const member = await tx.member.update({
        where: { id },
        data: {
          cardId,
          gender,
          birthDate: birthDate ? new Date(birthDate) : null,
          emergencyContact,
          notes
        },
        include: {
          user: true,
          gym: true
        }
      })

      return member
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const member = await db.member.findUnique({
      where: { id }
    })

    if (!member) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    // İlişkili kayıtları sil
    await db.$transaction(async (tx) => {
      // 1. Ödemeleri sil
      await tx.payment.deleteMany({
        where: { memberId: id }
      })
      
      // 2. Borçları sil
      await tx.debt.deleteMany({
        where: { memberId: id }
      })
      
      // 3. Giriş loglarını sil
      await tx.entryLog.deleteMany({
        where: { memberId: id }
      })
      
      // 4. Dondurma kayıtlarını sil
      await tx.freezePeriod.deleteMany({
        where: { memberId: id }
      })
      
      // 5. Üyelikleri sil
      await tx.membership.deleteMany({
        where: { memberId: id }
      })
      
      // 6. Üyeyi sil
      await tx.member.delete({
        where: { id }
      })
      
      // 7. Kullanıcıyı sil
      await tx.user.delete({
        where: { id: member.userId }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete member error:', error)
    return NextResponse.json({ error: 'Üye silinemedi: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') }, { status: 500 })
  }
}
