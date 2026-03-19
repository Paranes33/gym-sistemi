import { db } from './db'
import { hashPassword } from './auth'

// Seed demo data if database is empty
export async function seedDatabase(): Promise<void> {
  const userCount = await db.user.count()
  
  if (userCount > 0) {
    return // Already seeded
  }
  
  console.log('Seeding database with demo data...')
  
  // Create super admin
  const superAdminPassword = await hashPassword('admin123')
  const superAdmin = await db.user.create({
    data: {
      email: 'superadmin@gym.com',
      password: superAdminPassword,
      name: 'Super Admin',
      phone: '+1234567890',
      role: 'SUPER_ADMIN',
      isActive: true
    }
  })
  
  // Create gyms
  const gym1 = await db.gym.create({
    data: {
      name: 'Fitness Center Downtown',
      address: '123 Main Street, Downtown',
      phone: '+1234567891',
      email: 'downtown@gym.com',
      isActive: true
    }
  })
  
  const gym2 = await db.gym.create({
    data: {
      name: 'Fitness Center Uptown',
      address: '456 Oak Avenue, Uptown',
      phone: '+1234567892',
      email: 'uptown@gym.com',
      isActive: true
    }
  })
  
  // Create salon admins
  const salonAdmin1Password = await hashPassword('admin123')
  const salonAdmin1 = await db.user.create({
    data: {
      email: 'admin.downtown@gym.com',
      password: salonAdmin1Password,
      name: 'John Smith',
      phone: '+1234567893',
      role: 'SALON_ADMIN',
      isActive: true,
      managedGym: {
        connect: { id: gym1.id }
      }
    }
  })
  
  const salonAdmin2Password = await hashPassword('admin123')
  const salonAdmin2 = await db.user.create({
    data: {
      email: 'admin.uptown@gym.com',
      password: salonAdmin2Password,
      name: 'Jane Doe',
      phone: '+1234567894',
      role: 'SALON_ADMIN',
      isActive: true,
      managedGym: {
        connect: { id: gym2.id }
      }
    }
  })
  
  // Create members with users
  const memberData = [
    {
      email: 'member1@gym.com',
      name: 'Alice Johnson',
      phone: '+1234567901',
      cardId: 'CARD001',
      gymId: gym1.id,
      membershipDays: 30,
      price: 500
    },
    {
      email: 'member2@gym.com',
      name: 'Bob Williams',
      phone: '+1234567902',
      cardId: 'CARD002',
      gymId: gym1.id,
      membershipDays: 90,
      price: 1200
    },
    {
      email: 'member3@gym.com',
      name: 'Charlie Brown',
      phone: '+1234567903',
      cardId: 'CARD003',
      gymId: gym1.id,
      membershipDays: 30,
      price: 500,
      expired: true
    },
    {
      email: 'member4@gym.com',
      name: 'Diana Miller',
      phone: '+1234567904',
      cardId: 'CARD004',
      gymId: gym2.id,
      membershipDays: 60,
      price: 800
    },
    {
      email: 'member5@gym.com',
      name: 'Edward Davis',
      phone: '+1234567905',
      cardId: 'CARD005',
      gymId: gym2.id,
      membershipDays: 30,
      price: 500,
      hasDebt: true
    },
    {
      email: 'member6@gym.com',
      name: 'Fiona Garcia',
      phone: '+1234567906',
      cardId: 'CARD006',
      gymId: gym1.id,
      membershipDays: 365,
      price: 5000,
      frozen: true
    }
  ]
  
  for (const data of memberData) {
    const memberPassword = await hashPassword('member123')
    const user = await db.user.create({
      data: {
        email: data.email,
        password: memberPassword,
        name: data.name,
        phone: data.phone,
        role: 'MEMBER',
        isActive: true
      }
    })
    
    const member = await db.member.create({
      data: {
        userId: user.id,
        gymId: data.gymId,
        cardId: data.cardId,
        gender: Math.random() > 0.5 ? 'Male' : 'Female'
      }
    })
    
    // Create membership
    const now = new Date()
    let startDate = new Date(now)
    let endDate: Date
    
    if (data.expired) {
      // Expired membership
      startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
      endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    } else if (data.frozen) {
      // Frozen membership
      startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      endDate = new Date(now.getTime() + (data.membershipDays - 15) * 24 * 60 * 60 * 1000)
    } else {
      endDate = new Date(now.getTime() + data.membershipDays * 24 * 60 * 60 * 1000)
    }
    
    const membership = await db.membership.create({
      data: {
        memberId: member.id,
        gymId: data.gymId,
        startDate,
        endDate,
        durationDays: data.membershipDays,
        status: data.expired ? 'EXPIRED' : data.frozen ? 'FROZEN' : 'ACTIVE',
        price: data.price,
        paidAmount: data.price * (data.hasDebt ? 0.5 : 1) // Half paid if has debt
      }
    })
    
    // Create debt if needed
    if (data.hasDebt) {
      await db.debt.create({
        data: {
          memberId: member.id,
          amount: data.price * 0.5,
          description: 'Remaining membership fee',
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Due in 7 days
        }
      })
    }
    
    // Create freeze period for frozen membership
    if (data.frozen) {
      await db.freezePeriod.create({
        data: {
          membershipId: membership.id,
          memberId: member.id,
          startDate: now,
          endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days freeze
          reason: 'Vacation',
          isActive: true
        }
      })
    }
    
    // Create some payment records
    await db.payment.create({
      data: {
        amount: data.price * (data.hasDebt ? 0.5 : 1),
        type: 'CASH',
        description: `Initial membership payment - ${data.membershipDays} days`,
        memberId: member.id,
        gymId: data.gymId,
        userId: data.gymId === gym1.id ? salonAdmin1.id : salonAdmin2.id,
        membershipId: membership.id,
        receiptNo: `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      }
    })
  }
  
  // Create some entry logs
  const members = await db.member.findMany()
  for (const member of members.slice(0, 4)) {
    const user = await db.user.findUnique({ where: { id: member.userId } })
    const membership = await db.membership.findFirst({ 
      where: { memberId: member.id } 
    })
    
    if (membership && membership.status === 'ACTIVE') {
      // Create today's entry
      await db.entryLog.create({
        data: {
          memberId: member.id,
          gymId: member.gymId,
          cardId: member.cardId,
          status: 'ALLOWED',
          entryTime: new Date()
        }
      })
      
      // Create yesterday's entry with exit
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0)
      
      const exitTime = new Date(yesterday)
      exitTime.setHours(12, 0, 0, 0)
      
      await db.entryLog.create({
        data: {
          memberId: member.id,
          gymId: member.gymId,
          cardId: member.cardId,
          status: 'ALLOWED',
          entryTime: yesterday,
          exitTime
        }
      })
    }
  }
  
  console.log('Database seeded successfully!')
}
