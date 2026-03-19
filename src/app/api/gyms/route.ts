import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const gyms = await db.gym.findMany({
      include: {
        admin: true,
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const result = gyms.map(gym => ({
      ...gym,
      memberCount: gym._count.members
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get gyms error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address, phone, email, adminId } = body

    if (!name) {
      return NextResponse.json({ error: 'Salon adı gerekli' }, { status: 400 })
    }

    const gym = await db.gym.create({
      data: {
        name,
        address,
        phone,
        email,
        adminId
      },
      include: {
        admin: true
      }
    })

    return NextResponse.json(gym)
  } catch (error) {
    console.error('Create gym error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
