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
    where: { email: 'thisarani@example.com' },
    update: {},
    create: {
      name: 'Thisarani aloka',
      email: 'thisarani@example.com'
    }
  })

  await prisma.user.upsert({
    where: { email: 'nipu@example.com' },
    update: {},
    create: {
      name: 'nipun wije',
      email: 'nipu@example.com'
    }
  })

  // Seed some sample books
  const categoriesData = await prisma.bookCategory.findMany()
  
  const books = [
    {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      price: 12.99,
      stock: 5,
      bookCategoryId: categoriesData.find(c => c.name === 'Fiction').id
    },
    {
      title: 'Introduction to Programming',
      author: 'John Doe',
      price: 45.50,
      stock: 3,
      bookCategoryId: categoriesData.find(c => c.name === 'Programming').id
    },
    {
      title: 'Science Fundamentals',
      author: 'Jane Smith',
      price: 29.99,
      stock: 7,
      bookCategoryId: categoriesData.find(c => c.name === 'Science').id
    }
  ]

  for (const book of books) {
    await prisma.book.upsert({
      where: { 
        title_author: {
          title: book.title,
          author: book.author
        }
      },
      update: {},
      create: book
    })
  }

  console.log('Seeded categories, users and books successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })