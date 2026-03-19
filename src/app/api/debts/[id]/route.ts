import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, description, dueDate } = body

    const debt = await db.debt.update({
      where: { id },
      data: {
        amount,
        description,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        member: { include: { user: true } }
      }
    })

    return NextResponse.json(debt)
  } catch (error) {
    console.error('Update debt error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.debt.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete debt error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
