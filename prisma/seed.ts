import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create super admin
  const superAdminPassword = await bcrypt.hash('admin123', 10)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@gym.com' },
    update: {},
    create: {
      email: 'super@gym.com',
      password: superAdminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN'
    }
  })
  console.log('Created super admin:', superAdmin.email)

  // Create gyms
  const gym1 = await prisma.gym.upsert({
    where: { id: 'gym1' },
    update: {},
    create: {
      id: 'gym1',
      name: 'Fitness Center Kadıköy',
      address: 'Kadıköy, Istanbul',
      phone: '0216 123 4567',
      email: 'kadikoy@gym.com'
    }
  })

  const gym2 = await prisma.gym.upsert({
    where: { id: 'gym2' },
    update: {},
    create: {
      id: 'gym2',
      name: 'Power Gym Beşiktaş',
      address: 'Beşiktaş, Istanbul',
      phone: '0212 987 6543',
      email: 'besiktas@gym.com'
    }
  })
  console.log('Created gyms')

  // Create salon admin
  const salonAdminPassword = await bcrypt.hash('admin123', 10)
  const salonAdmin = await prisma.user.upsert({
    where: { email: 'salon@gym.com' },
    update: {},
    create: {
      email: 'salon@gym.com',
      password: salonAdminPassword,
      name: 'Salon Yöneticisi',
      phone: '0532 111 2233',
      role: 'SALON_ADMIN'
    }
  })

  // Assign salon admin to gym
  await prisma.gym.update({
    where: { id: 'gym1' },
    data: { adminId: salonAdmin.id }
  })
  console.log('Created salon admin:', salonAdmin.email)

  // Create members
  const memberPassword = await bcrypt.hash('member123', 10)
  const members = [
    { name: 'Ahmet Yılmaz', email: 'member@gym.com', phone: '0533 111 0001', cardId: 'CARD001' },
    { name: 'Ayşe Demir', email: 'ayse@gym.com', phone: '0533 111 0002', cardId: 'CARD002' },
    { name: 'Mehmet Kaya', email: 'mehmet@gym.com', phone: '0533 111 0003', cardId: 'CARD003' },
    { name: 'Fatma Öz', email: 'fatma@gym.com', phone: '0533 111 0004', cardId: 'CARD004' },
    { name: 'Ali Çelik', email: 'ali@gym.com', phone: '0533 111 0005', cardId: 'CARD005' },
    { name: 'Zeynep Arslan', email: 'zeynep@gym.com', phone: '0533 111 0006', cardId: 'CARD006' },
    { name: 'Mustafa Koç', email: 'mustafa@gym.com', phone: '0533 111 0007', cardId: 'CARD007' },
    { name: 'Elif Şahin', email: 'elif@gym.com', phone: '0533 111 0008', cardId: 'CARD008' },
    { name: 'Hasan Yıldız', email: 'hasan@gym.com', phone: '0533 111 0009', cardId: 'CARD009' },
    { name: 'Merve Aksoy', email: 'merve@gym.com', phone: '0533 111 0010', cardId: 'CARD010' }
  ]

  for (const m of members) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        password: memberPassword,
        name: m.name,
        phone: m.phone,
        role: 'MEMBER'
      }
    })

    const existingMember = await prisma.member.findUnique({ where: { userId: user.id } })
    const existingCard = await prisma.member.findUnique({ where: { cardId: m.cardId } })
    
    if (!existingMember && !existingCard) {
      await prisma.member.create({
        data: {
          userId: user.id,
          gymId: 'gym1',
          cardId: m.cardId,
          gender: m.name.includes('Ayşe') || m.name.includes('Fatma') || m.name.includes('Zeynep') || m.name.includes('Elif') || m.name.includes('Merve') ? 'female' : 'male'
        }
      })
    } else if (existingMember && !existingMember.cardId) {
      await prisma.member.update({
        where: { id: existingMember.id },
        data: { cardId: m.cardId }
      })
    }
  }
  console.log('Created members')

  // Get all members
  const allMembers = await prisma.member.findMany()

  // Create memberships
  const now = new Date()
  for (let i = 0; i < allMembers.length; i++) {
    const member = allMembers[i]
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 20))
    
    const endDate = new Date(startDate)
    const durationDays = [30, 60, 90][Math.floor(Math.random() * 3)]
    endDate.setDate(endDate.getDate() + durationDays)

    // Some expired memberships
    if (i < 2) {
      endDate.setDate(endDate.getDate() - 10) // Expired
    }

    // Some frozen memberships
    const status = i === 2 ? 'FROZEN' : (endDate < now ? 'EXPIRED' : 'ACTIVE')

    await prisma.membership.create({
      data: {
        memberId: member.id,
        gymId: member.gymId,
        startDate,
        endDate,
        durationDays,
        price: durationDays * 50, // 50 TL per day
        paidAmount: durationDays * 50 - (i === 4 ? 500 : 0), // Some with debt
        status
      }
    })
  }
  console.log('Created memberships')

  // Create some debts
  const memberWithDebt = allMembers[4]
  if (memberWithDebt) {
    await prisma.debt.create({
      data: {
        memberId: memberWithDebt.id,
        amount: 500,
        description: 'Eksik üyelik ödemesi'
      }
    })
  }
  console.log('Created debts')

  // Create some payments
  for (let i = 0; i < 5; i++) {
    const member = allMembers[i]
    if (member) {
      await prisma.payment.create({
        data: {
          memberId: member.id,
          gymId: member.gymId,
          userId: salonAdmin.id,
          amount: Math.floor(Math.random() * 1000) + 500,
          type: i % 2 === 0 ? 'CASH' : 'CARD',
          description: 'Üyelik ödemesi'
        }
      })
    }
  }
  console.log('Created payments')

  // Create some entry logs
  for (let i = 0; i < allMembers.length; i++) {
    const member = allMembers[i]
    if (member) {
      const entryTime = new Date()
      entryTime.setHours(entryTime.getHours() - Math.floor(Math.random() * 24))
      
      await prisma.entryLog.create({
        data: {
          memberId: member.id,
          gymId: member.gymId,
          cardId: member.cardId,
          status: 'ALLOWED',
          entryTime
        }
      })
    }
  }
  console.log('Created entry logs')

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
