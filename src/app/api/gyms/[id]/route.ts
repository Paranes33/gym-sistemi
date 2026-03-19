import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const gym = await db.gym.findUnique({
      where: { id },
      include: {
        admin: true,
        _count: {
          select: { members: true }
        }
      }
    })

    if (!gym) {
      return NextResponse.json({ error: 'Salon bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({
      ...gym,
      memberCount: gym._count.members
    })
  } catch (error) {
    console.error('Get gym error:', error)
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
    const { name, address, phone, email, adminId, isActive } = body

    const gym = await db.gym.update({
      where: { id },
      data: {
        name,
        address,
        phone,
        email,
        adminId: adminId || null,
        isActive
      },
      include: {
        admin: true
      }
    })

    return NextResponse.json(gym)
  } catch (error) {
    console.error('Update gym error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.gym.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete gym error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
