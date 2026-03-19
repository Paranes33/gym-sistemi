import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const gymId = searchParams.get('gymId')
    const unpaidOnly = searchParams.get('unpaidOnly') === 'true'

    console.log('GET /api/debts - memberId:', memberId, 'gymId:', gymId, 'unpaidOnly:', unpaidOnly)

    // gymId verilmişse, o salondaki üyelerin borçlarını getir
    if (gymId) {
      const debts = await db.debt.findMany({
        where: {
          ...(memberId && { memberId }),
          ...(unpaidOnly && { isPaid: false }),
          member: {
            gymId: gymId
          }
        },
        include: {
          member: { 
            include: { 
              user: {
                select: { id: true, name: true, email: true, phone: true }
              }
            } 
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      console.log(`Found ${debts.length} debts for gym ${gymId}`)
      return NextResponse.json(debts)
    }

    // gymId yoksa eski davranış (tüm borçlar)
    const where: any = {}
    if (memberId) where.memberId = memberId
    if (unpaidOnly) where.isPaid = false

    const debts = await db.debt.findMany({
      where,
      include: {
        member: { 
          include: { 
            user: {
              select: { id: true, name: true, email: true, phone: true }
            }
          } 
        }
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

    console.log('POST /api/debts - body:', body)

    if (!memberId || !amount || amount <= 0 || !description) {
      return NextResponse.json({ error: 'Eksik veya geçersiz bilgi' }, { status: 400 })
    }

    // Üyeyi bul ve gymId'sini al
    const member = await db.member.findUnique({
      where: { id: memberId }
    })

    if (!member) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    const debt = await db.debt.create({
      data: {
        memberId,
        amount,
        description,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        member: { 
          include: { 
            user: {
              select: { id: true, name: true, email: true, phone: true }
            }
          } 
        }
      }
    })

    console.log('Debt created:', debt.id)

    return NextResponse.json(debt)
  } catch (error) {
    console.error('Create debt error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
