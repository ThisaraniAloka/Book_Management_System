const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Seed categories
  const categories = ['Fiction', 'Science', 'History', 'Programming', 'Children']
  
  for (const name of categories) {
    await prisma.bookCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    })
  }

  // Seed sample users
  await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  })

  await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      name: 'Jane Smith',
      email: 'jane@example.com'
    }
  })

  console.log('Seeded categories and users successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })