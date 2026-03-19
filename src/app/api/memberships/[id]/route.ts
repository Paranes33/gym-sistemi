import { db } from '@/lib/db'
import { 
  getCurrentUser, 
  apiResponse, 
  apiError, 
  unauthorizedError,
  forbiddenError,
  notFoundError
} from '@/lib/auth'

// GET: Get membership by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedError()
    
    const { id } = await params
    
    const membership = await db.membership.findUnique({
      where: { id },
      include: {
        member: {
          include: { user: true }
        },
        gym: true,
        freezes: {
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })
    
    if (!membership) {
      return notFoundError('Membership not found')
    }
    
    // Check permission
    if (user.role === 'SALON_ADMIN' && membership.gymId !== user.gymId) {
      return forbiddenError()
    }
    
    return apiResponse({
      id: membership.id,
      memberId: membership.memberId,
      member: {
        id: membership.member.id,
        userId: membership.member.userId,
        user: {
          id: membership.member.user.id,
          name: membership.member.user.name,
          email: membership.member.user.email,
          phone: membership.member.user.phone || undefined
        },
        cardId: membership.member.cardId || undefined
      },
      gymId: membership.gymId,
      gym: {
        id: membership.gym.id,
        name: membership.gym.name,
        address: membership.gym.address || undefined
      },
      startDate: membership.startDate.toISOString(),
      endDate: membership.endDate.toISOString(),
      durationDays: membership.durationDays,
      status: membership.status,
      price: membership.price,
      paidAmount: membership.paidAmount,
      notes: membership.notes || undefined,
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
      remainingDays: Math.max(0, Math.ceil((new Date(membership.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))),
      freezes: membership.freezes.map(f => ({
        id: f.id,
        startDate: f.startDate.toISOString(),
        endDate: f.endDate.toISOString(),
        extendedDays: f.extendedDays,
        reason: f.reason || undefined,
        isActive: f.isActive,
        createdAt: f.createdAt.toISOString()
      })),
      payments: membership.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        type: p.type,
        description: p.description || undefined,
        receiptNo: p.receiptNo || undefined,
        createdAt: p.createdAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('Get membership error:', error)
    return apiError('Internal server error', 500)
  }
}

// PUT: Update membership
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedError()
    
    if (user.role === 'MEMBER') {
      return forbiddenError()
    }
    
    const { id } = await params
    
    const membership = await db.membership.findUnique({
      where: { id }
    })
    
    if (!membership) {
      return notFoundError('Membership not found')
    }
    
    // Check permission
    if (user.role === 'SALON_ADMIN' && membership.gymId !== user.gymId) {
      return forbiddenError()
    }
    
    const body = await request.json()
    const { 
      startDate,
      endDate,
      durationDays,
      status,
      price,
      paidAmount,
      notes
    } = body
    
    const updateData: any = {}
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate) updateData.endDate = new Date(endDate)
    if (durationDays) updateData.durationDays = durationDays
    if (status) updateData.status = status
    if (price !== undefined) updateData.price = price
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount
    if (notes !== undefined) updateData.notes = notes
    
    const updated = await db.membership.update({
      where: { id },
      data: updateData,
      include: {
        member: {
          include: { user: true }
        },
        gym: true
      }
    })
    
    return apiResponse({
      id: updated.id,
      memberId: updated.memberId,
      member: {
        id: updated.member.id,
        userId: updated.member.userId,
        user: {
          id: updated.member.user.id,
          name: updated.member.user.name,
          email: updated.member.user.email
        }
      },
      gymId: updated.gymId,
      gym: {
        id: updated.gym.id,
        name: updated.gym.name
      },
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      durationDays: updated.durationDays,
      status: updated.status,
      price: updated.price,
      paidAmount: updated.paidAmount,
      notes: updated.notes || undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Update membership error:', error)
    return apiError('Internal server error', 500)
  }
}
