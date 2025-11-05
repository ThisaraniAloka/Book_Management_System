require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client')

// Increase transaction timeout
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})
const app = express()

app.use(cors())
app.use(bodyParser.json())

// Validation middleware
const validateBook = (req, res, next) => {
  const { title, author, price, stock, bookCategoryId } = req.body
  
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }
  
  if (!author || !author.trim()) {
    return res.status(400).json({ error: 'Author is required' })
  }
  
  if (price === undefined || isNaN(price) || parseFloat(price) < 0) {
    return res.status(400).json({ error: 'Valid price is required and must be non-negative' })
  }
  
  if (stock === undefined || isNaN(stock) || parseInt(stock) < 0) {
    return res.status(400).json({ error: 'Valid stock is required and must be non-negative' })
  }
  
  if (!bookCategoryId || isNaN(bookCategoryId)) {
    return res.status(400).json({ error: 'Valid category is required' })
  }
  
  next()
}

// Get all books with optional category filter
app.get('/books', async (req, res) => {
  try {
    const { categoryId, search } = req.query
    let where = {}
    
    if (categoryId) {
      where.bookCategoryId = parseInt(categoryId)
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    const books = await prisma.book.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(books)
  } catch (error) {
    console.error('Error fetching books:', error)
    res.status(500).json({ error: 'Failed to fetch books' })
  }
})

// Get book by ID
app.get('/books/:id', async (req, res) => {
  try {
    const { id } = req.params
    const book = await prisma.book.findUnique({
      where: { id: parseInt(id) },
      include: { category: true }
    })
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }
    
    res.json(book)
  } catch (error) {
    console.error('Error fetching book:', error)
    res.status(500).json({ error: 'Failed to fetch book' })
  }
})

// Create new book
app.post('/books', validateBook, async (req, res) => {
  try {
    const { title, author, price, stock, bookCategoryId } = req.body
    
    // Check if category exists
    const category = await prisma.bookCategory.findUnique({
      where: { id: parseInt(bookCategoryId) }
    })
    
    if (!category) {
      return res.status(400).json({ error: 'Invalid category' })
    }
    
    const book = await prisma.book.create({
      data: {
        title: title.trim(),
        author: author.trim(),
        price: parseFloat(price),
        stock: parseInt(stock),
        bookCategoryId: parseInt(bookCategoryId)
      },
      include: { category: true }
    })
    
    res.status(201).json(book)
  } catch (error) {
    console.error('Error creating book:', error)
    res.status(500).json({ error: 'Failed to create book' })
  }
})

// Update book
app.put('/books/:id', validateBook, async (req, res) => {
  try {
    const { id } = req.params
    const { title, author, price, stock, bookCategoryId } = req.body
    
    // Check if book exists
    const existingBook = await prisma.book.findUnique({
      where: { id: parseInt(id) }
    })
    
    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found' })
    }
    
    // Check if category exists
    const category = await prisma.bookCategory.findUnique({
      where: { id: parseInt(bookCategoryId) }
    })
    
    if (!category) {
      return res.status(400).json({ error: 'Invalid category' })
    }
    
    const book = await prisma.book.update({
      where: { id: parseInt(id) },
      data: {
        title: title.trim(),
        author: author.trim(),
        price: parseFloat(price),
        stock: parseInt(stock),
        bookCategoryId: parseInt(bookCategoryId)
      },
      include: { category: true }
    })
    
    res.json(book)
  } catch (error) {
    console.error('Error updating book:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Book not found' })
    }
    res.status(500).json({ error: 'Failed to update book' })
  }
})

// Delete book - COMPLETELY FIXED VERSION
app.delete('/books/:id', async (req, res) => {
  try {
    const { id } = req.params
    const bookId = parseInt(id)
    
    // Check if book has CURRENT borrow records (not returned yet)
    const currentBorrows = await prisma.currentBorrow.findMany({
      where: { bookId }
    })
    
    if (currentBorrows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete book that is currently borrowed by users' 
      })
    }
    
    // Delete related records first (borrow records and current borrows)
    await prisma.$transaction([
      // Delete borrow records (history)
      prisma.borrowRecord.deleteMany({
        where: { bookId }
      }),
      // Delete current borrows (should be empty but just in case)
      prisma.currentBorrow.deleteMany({
        where: { bookId }
      }),
      // Finally delete the book
      prisma.book.delete({
        where: { id: bookId }
      })
    ])
    
    res.json({ message: 'Book deleted successfully' })
  } catch (error) {
    console.error('Error deleting book:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Book not found' })
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete book due to existing related records' })
    }
    res.status(500).json({ error: 'Failed to delete book' })
  }
})

// Borrow book - with increased timeout
app.post('/borrow', async (req, res) => {
  try {
    const { userId, bookId, quantity = 1 } = req.body
    
    if (!userId || !bookId) {
      return res.status(400).json({ error: 'User ID and Book ID are required' })
    }
    
    if (isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required' })
    }
    
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: parseInt(bookId) }
      })
      
      if (!book) {
        throw new Error('Book not found')
      }
      
      const user = await tx.user.findUnique({
        where: { id: parseInt(userId) }
      })
      
      if (!user) {
        throw new Error('User not found')
      }
      
      if (book.stock < quantity) {
        throw new Error('Not enough stock available')
      }
      
      // Check if user already has this book borrowed
      const existingBorrow = await tx.currentBorrow.findUnique({
        where: {
          userId_bookId: {
            userId: parseInt(userId),
            bookId: parseInt(bookId)
          }
        }
      })
      
      // Create borrow record
      const borrowRecord = await tx.borrowRecord.create({
        data: {
          userId: parseInt(userId),
          bookId: parseInt(bookId),
          action: 'borrow',
          quantity: parseInt(quantity)
        }
      })
      
      // Update or create current borrow record
      if (existingBorrow) {
        await tx.currentBorrow.update({
          where: {
            userId_bookId: {
              userId: parseInt(userId),
              bookId: parseInt(bookId)
            }
          },
          data: {
            quantity: existingBorrow.quantity + parseInt(quantity)
          }
        })
      } else {
        await tx.currentBorrow.create({
          data: {
            userId: parseInt(userId),
            bookId: parseInt(bookId),
            quantity: parseInt(quantity)
          }
        })
      }
      
      // Update book stock
      await tx.book.update({
        where: { id: parseInt(bookId) },
        data: { stock: book.stock - parseInt(quantity) }
      })
      
      return borrowRecord
    }, {
      maxWait: 10000, // Increase timeout
      timeout: 10000  // Increase timeout to 10 seconds
    })
    
    res.json({ 
      message: 'Book borrowed successfully',
      record: result 
    })
  } catch (error) {
    console.error('Error borrowing book:', error)
    res.status(400).json({ error: error.message })
  }
})

// Return book - with increased timeout
app.post('/return', async (req, res) => {
  try {
    const { userId, bookId, quantity = 1 } = req.body
    
    if (!userId || !bookId) {
      return res.status(400).json({ error: 'User ID and Book ID are required' })
    }
    
    if (isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required' })
    }
    
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: parseInt(bookId) }
      })
      
      if (!book) {
        throw new Error('Book not found')
      }
      
      const user = await tx.user.findUnique({
        where: { id: parseInt(userId) }
      })
      
      if (!user) {
        throw new Error('User not found')
      }
      
      // Check if user has actually borrowed this book
      const currentBorrow = await tx.currentBorrow.findUnique({
        where: {
          userId_bookId: {
            userId: parseInt(userId),
            bookId: parseInt(bookId)
          }
        }
      })
      
      if (!currentBorrow) {
        throw new Error('User has not borrowed this book')
      }
      
      if (currentBorrow.quantity < quantity) {
        throw new Error(`User has only borrowed ${currentBorrow.quantity} copies, cannot return ${quantity}`)
      }
      
      // Create return record
      const returnRecord = await tx.borrowRecord.create({
        data: {
          userId: parseInt(userId),
          bookId: parseInt(bookId),
          action: 'return',
          quantity: parseInt(quantity)
        }
      })
      
      // Update current borrow record
      if (currentBorrow.quantity === quantity) {
        // Remove record if returning all copies
        await tx.currentBorrow.delete({
          where: {
            userId_bookId: {
              userId: parseInt(userId),
              bookId: parseInt(bookId)
            }
          }
        })
      } else {
        // Update quantity if returning some copies
        await tx.currentBorrow.update({
          where: {
            userId_bookId: {
              userId: parseInt(userId),
              bookId: parseInt(bookId)
            }
          },
          data: {
            quantity: currentBorrow.quantity - parseInt(quantity)
          }
        })
      }
      
      // Update book stock
      await tx.book.update({
        where: { id: parseInt(bookId) },
        data: { stock: book.stock + parseInt(quantity) }
      })
      
      return returnRecord
    }, {
      maxWait: 10000, // Increase timeout
      timeout: 10000  // Increase timeout to 10 seconds
    })
    
    res.json({ 
      message: 'Book returned successfully',
      record: result 
    })
  } catch (error) {
    console.error('Error returning book:', error)
    res.status(400).json({ error: error.message })
  }
})

// Get user's current borrows
app.get('/users/:userId/current-borrows', async (req, res) => {
  try {
    const { userId } = req.params
    
    const currentBorrows = await prisma.currentBorrow.findMany({
      where: { userId: parseInt(userId) },
      include: {
        book: {
          include: { category: true }
        },
        user: true
      }
    })
    
    res.json(currentBorrows)
  } catch (error) {
    console.error('Error fetching current borrows:', error)
    res.status(500).json({ error: 'Failed to fetch current borrows' })
  }
})

// Get all categories
app.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.bookCategory.findMany({
      orderBy: { name: 'asc' }
    })
    res.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

// Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' }
    })
    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Get borrow records with filters
app.get('/borrow-records', async (req, res) => {
  try {
    const { userId, bookId, action } = req.query
    let where = {}
    
    if (userId) where.userId = parseInt(userId)
    if (bookId) where.bookId = parseInt(bookId)
    if (action) where.action = action
    
    const records = await prisma.borrowRecord.findMany({
      where,
      include: {
        user: true,
        book: {
          include: { category: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(records)
  } catch (error) {
    console.error('Error fetching borrow records:', error)
    res.status(500).json({ error: 'Failed to fetch borrow records' })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})