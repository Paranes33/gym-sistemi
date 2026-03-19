import { db } from '@/lib/db'
import { 
  getCurrentUser, 
  apiResponse, 
  apiError, 
  unauthorizedError 
} from '@/lib/auth'

// GET: Find member by card ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedError()
    
    const { cardId } = await params
    
    const member = await db.member.findUnique({
      where: { cardId },
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
      }
    })
    
    if (!member) {
      return apiError('Member not found with this card ID', 404)
    }
    
    const totalDebt = member.debts.reduce((sum, d) => sum + d.amount, 0)
    const activeMembership = member.memberships[0]
    
    return apiResponse({
      id: member.id,
      userId: member.userId,
      user: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
        phone: member.user.phone || undefined,
        role: member.user.role,
        image: member.user.image || undefined,
        isActive: member.user.isActive,
        createdAt: member.user.createdAt.toISOString(),
        updatedAt: member.user.updatedAt.toISOString()
      },
      gymId: member.gymId,
      gym: {
        id: member.gym.id,
        name: member.gym.name,
        address: member.gym.address || undefined,
        phone: member.gym.phone || undefined,
        email: member.gym.email || undefined,
        isActive: member.gym.isActive,
        createdAt: member.gym.createdAt.toISOString(),
        updatedAt: member.gym.updatedAt.toISOString(),
        adminId: member.gym.adminId || undefined
      },
      cardId: member.cardId || undefined,
      qrCode: member.qrCode || undefined,
      birthDate: member.birthDate?.toISOString(),
      gender: member.gender || undefined,
      emergencyContact: member.emergencyContact || undefined,
      notes: member.notes || undefined,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
      activeMembership: activeMembership ? {
        id: activeMembership.id,
        memberId: activeMembership.memberId,
        gymId: activeMembership.gymId,
        startDate: activeMembership.startDate.toISOString(),
        endDate: activeMembership.endDate.toISOString(),
        durationDays: activeMembership.durationDays,
        status: activeMembership.status,
        price: activeMembership.price,
        paidAmount: activeMembership.paidAmount,
        notes: activeMembership.notes || undefined,
        createdAt: activeMembership.createdAt.toISOString(),
        updatedAt: activeMembership.updatedAt.toISOString(),
        remainingDays: Math.max(0, Math.ceil((new Date(activeMembership.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      } : null,
      totalDebt,
      canEnter: member.user.isActive && 
                activeMembership !== undefined && 
                activeMembership.status === 'ACTIVE' && 
                new Date(activeMembership.endDate) > new Date() &&
                totalDebt === 0
    })
  } catch (error) {
    console.error('Get member by card error:', error)
    return apiError('Internal server error', 500)
  }
}
