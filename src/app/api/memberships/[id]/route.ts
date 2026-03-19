import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const membership = await db.membership.findUnique({
      where: { id },
      include: {
        member: { include: { user: true } },
        gym: true
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Üyelik bulunamadı' }, { status: 404 })
    }

    return NextResponse.json(membership)
  } catch (error) {
    console.error('Get membership error:', error)
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
    const { endDate, status } = body

    const membership = await db.membership.findUnique({
      where: { id }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Üyelik bulunamadı' }, { status: 404 })
    }

    const updateData: any = {}
    if (endDate) {
      updateData.endDate = new Date(endDate)
      // Süreyi güncelle
      const startDate = new Date(membership.startDate)
      const newEndDate = new Date(endDate)
      updateData.durationDays = Math.ceil((newEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    }
    if (status) {
      updateData.status = status
    }

    const updated = await db.membership.update({
      where: { id },
      data: updateData,
      include: {
        member: { include: { user: true } }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update membership error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
