import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gymId')

    // Find member by card ID
    const member = await db.member.findUnique({
      where: { cardId },
      include: {
        user: true,
        memberships: {
          where: { status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
          take: 1
        },
        debts: {
          where: { isPaid: false }
        }
      }
    })

    if (!member) {
      // Log failed entry
      if (gymId) {
        await db.entryLog.create({
          data: {
            cardId,
            gymId,
            status: 'DENIED_INACTIVE',
            denialReason: 'Kart bulunamadı'
          }
        })
      }
      return NextResponse.json({ allowed: false, reason: 'Kart bulunamadı', member: null })
    }

    const activeMembership = member.memberships[0]
    const totalDebt = member.debts.reduce((sum, d) => sum + d.amount, 0)

    // Check membership status
    if (!activeMembership) {
      await logEntry(member.id, member.gymId, cardId, 'DENIED_INACTIVE', 'Aktif üyelik yok')
      return NextResponse.json({ 
        allowed: false, 
        reason: 'Aktif üyelik bulunamadı',
        member: formatMember(member, null, totalDebt)
      })
    }

    if (activeMembership.status === 'FROZEN') {
      await logEntry(member.id, member.gymId, cardId, 'DENIED_FROZEN', 'Üyelik dondurulmuş')
      return NextResponse.json({ 
        allowed: false, 
        reason: 'Üyelik dondurulmuş',
        member: formatMember(member, activeMembership, totalDebt)
      })
    }

    const now = new Date()
    if (new Date(activeMembership.endDate) < now) {
      // Update membership status to expired
      await db.membership.update({
        where: { id: activeMembership.id },
        data: { status: 'EXPIRED' }
      })
      await logEntry(member.id, member.gymId, cardId, 'DENIED_EXPIRED', 'Üyelik süresi dolmuş')
      return NextResponse.json({ 
        allowed: false, 
        reason: 'Üyelik süresi dolmuş',
        member: formatMember(member, activeMembership, totalDebt)
      })
    }

    // Check for debt (optional - can allow entry with debt)
    if (totalDebt > 1000) { // Allow entry if debt is less than 1000 TL
      await logEntry(member.id, member.gymId, cardId, 'DENIED_DEBT', `Borç: ₺${totalDebt}`)
      return NextResponse.json({ 
        allowed: false, 
        reason: `Ödenmemiş borç: ₺${totalDebt.toLocaleString()}`,
        member: formatMember(member, activeMembership, totalDebt)
      })
    }

    // Entry allowed
    await db.entryLog.create({
      data: {
        memberId: member.id,
        gymId: member.gymId,
        cardId,
        status: 'ALLOWED'
      }
    })

    return NextResponse.json({ 
      allowed: true, 
      member: formatMember(member, activeMembership, totalDebt)
    })
  } catch (error) {
    console.error('Check entry error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function logEntry(memberId: string, gymId: string, cardId: string, status: string, reason: string) {
  await db.entryLog.create({
    data: { memberId, gymId, cardId, status: status as any, denialReason: reason }
  })
}

function formatMember(member: any, activeMembership: any, totalDebt: number) {
  return {
    id: member.id,
    userId: member.userId,
    user: member.user,
    gymId: member.gymId,
    cardId: member.cardId,
    activeMembership: activeMembership ? {
      ...activeMembership,
      remainingDays: Math.ceil((new Date(activeMembership.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    } : null,
    totalDebt
  }
}
