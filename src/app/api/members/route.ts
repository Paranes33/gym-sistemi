import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const hasDebt = searchParams.get('hasDebt')
    const gymId = searchParams.get('gymId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: any = {}

    if (gymId) {
      where.gymId = gymId
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { user: { phone: { contains: search } } },
        { cardId: { contains: search } }
      ]
    }

    const members = await db.member.findMany({
      where,
      include: {
        user: true,
        gym: true,
        memberships: {
          where: { status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
          take: 1
        },
        debts: {
          where: { isPaid: false }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    // Calculate additional fields and filter by status/debt
    let filteredMembers = members.map(member => {
      const activeMembership = member.memberships[0]
      const totalDebt = member.debts.reduce((sum, d) => sum + d.amount, 0)

      return {
        ...member,
        activeMembership,
        totalDebt
      }
    })

    // Filter by status
    if (status && status !== 'ALL') {
      filteredMembers = filteredMembers.filter(m => m.activeMembership?.status === status || 
        (!m.activeMembership && status === 'INACTIVE'))
    }

    // Filter by debt
    if (hasDebt === 'true') {
      filteredMembers = filteredMembers.filter(m => m.totalDebt > 0)
    }

    const total = await db.member.count({ where })

    return NextResponse.json({
      data: filteredMembers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, password, cardId, gymId, gender, birthDate, emergencyContact, notes } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Ad, e-posta ve şifre gerekli' }, { status: 400 })
    }

    // Check if email exists
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Bu e-posta zaten kullanılıyor' }, { status: 400 })
    }

    // Check if cardId exists
    if (cardId) {
      const existingCard = await db.member.findUnique({ where: { cardId } })
      if (existingCard) {
        return NextResponse.json({ error: 'Bu kart ID zaten kullanılıyor' }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Get first gym if not specified
    let targetGymId = gymId
    if (!targetGymId) {
      const firstGym = await db.gym.findFirst()
      if (firstGym) targetGymId = firstGym.id
    }

    if (!targetGymId) {
      return NextResponse.json({ error: 'Spor salonu bulunamadı' }, { status: 400 })
    }

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: 'MEMBER'
        }
      })

      const member = await tx.member.create({
        data: {
          userId: user.id,
          gymId: targetGymId,
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
    console.error('Create member error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
