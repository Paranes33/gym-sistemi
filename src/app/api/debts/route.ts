import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const unpaidOnly = searchParams.get('unpaidOnly') === 'true'

    const where: any = {}
    if (memberId) where.memberId = memberId
    if (unpaidOnly) where.isPaid = false

    const debts = await db.debt.findMany({
      where,
      include: {
        member: { include: { user: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(debts)
  } catch (error) {
    console.error('Get debts error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, amount, description, dueDate } = body

    if (!memberId || !amount || amount <= 0 || !description) {
      return NextResponse.json({ error: 'Eksik veya geçersiz bilgi' }, { status: 400 })
    }

    const debt = await db.debt.create({
      data: {
        memberId,
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
    console.error('Create debt error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
