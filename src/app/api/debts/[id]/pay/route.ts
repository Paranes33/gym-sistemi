import { db } from '@/lib/db'
import { 
  getCurrentUser, 
  apiResponse, 
  apiError, 
  unauthorizedError,
  forbiddenError,
  notFoundError
} from '@/lib/auth'
import { PaymentType } from '@prisma/client'

// POST: Pay debt
export async function POST(
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
    
    const debt = await db.debt.findUnique({
      where: { id },
      include: { 
        member: { include: { user: true, gym: true } }
      }
    })
    
    if (!debt) {
      return notFoundError('Debt not found')
    }
    
    // Check permission
    if (user.role === 'SALON_ADMIN' && debt.member.gymId !== user.gymId) {
      return forbiddenError()
    }
    
    // Check if already paid
    if (debt.isPaid) {
      return apiError('Debt is already paid')
    }
    
    const body = await request.json()
    const { 
      amount,
      type = 'CASH',
      notes
    } = body
    
    if (!amount || amount <= 0) {
      return apiError('Valid payment amount is required')
    }
    
    const now = new Date()
    const paymentAmount = Math.min(amount, debt.amount)
    
    // Create payment record
    const payment = await db.payment.create({
      data: {
        amount: paymentAmount,
        type: type as PaymentType,
        description: `Debt payment - ${debt.description}`,
        memberId: debt.memberId,
        gymId: debt.member.gymId,
        userId: user.id,
        debtId: debt.id,
        receiptNo: `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        notes
      },
      include: {
        member: { include: { user: true } },
        gym: true
      }
    })
    
    // Mark debt as paid if fully paid
    if (amount >= debt.amount) {
      await db.debt.update({
        where: { id: debt.id },
        data: { 
          isPaid: true,
          paidAt: now
        }
      })
    } else {
      // Partial payment - reduce debt amount
      await db.debt.update({
        where: { id: debt.id },
        data: { 
          amount: debt.amount - paymentAmount
        }
      })
    }
    
    return apiResponse({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        type: payment.type,
        receiptNo: payment.receiptNo,
        createdAt: payment.createdAt.toISOString()
      },
      debt: {
        id: debt.id,
        originalAmount: debt.amount,
        paidAmount: paymentAmount,
        fullyPaid: amount >= debt.amount
      },
      member: {
        id: debt.member.id,
        name: debt.member.user.name
      }
    })
  } catch (error) {
    console.error('Pay debt error:', error)
    return apiError('Internal server error', 500)
  }
}
