import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gymId')
    const memberId = searchParams.get('memberId')

    const where: any = {}
    if (gymId) where.gymId = gymId
    if (memberId) where.memberId = memberId

    const logs = await db.entryLog.findMany({
      where,
      include: {
        member: {
          include: { user: true }
        },
        gym: true
      },
      orderBy: { entryTime: 'desc' },
      take: 50
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Get entry logs error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
