import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

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
        debts: {
          where: { isPaid: false }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    const totalDebt = member.debts.reduce((sum, d) => sum + d.amount, 0)
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

    const result = await db.$transaction(async (tx) => {
      const updateData: any = {}
      if (name) updateData.name = name
      if (email) updateData.email = email
      if (phone !== undefined) updateData.phone = phone
      if (password) updateData.password = await bcrypt.hash(password, 10)

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

    await db.$transaction(async (tx) => {
      await tx.member.delete({ where: { id } })
      await tx.user.delete({ where: { id: member.userId } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete member error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
