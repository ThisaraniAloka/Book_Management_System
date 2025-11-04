require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const app = express()

app.use(cors())
app.use(bodyParser.json())

// Get all books with optional category filter
app.get('/books', async (req, res) => {
  try {
    const { categoryId } = req.query
    const where = categoryId ? { bookCategoryId: parseInt(categoryId) } : {}
    
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
app.post('/books', async (req, res) => {
  try {
    const { title, author, price, stock, bookCategoryId } = req.body
    
    // Validation
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' })
    }
    
    if (isNaN(price) || isNaN(stock)) {
      return res.status(400).json({ error: 'Price and stock must be numbers' })
    }
    
    if (price < 0 || stock < 0) {
      return res.status(400).json({ error: 'Price and stock cannot be negative' })
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
app.put('/books/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title, author, price, stock, bookCategoryId } = req.body
    
    // Validation
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' })
    }
    
    if (isNaN(price) || isNaN(stock)) {
      return res.status(400).json({ error: 'Price and stock must be numbers' })
    }
    
    if (price < 0 || stock < 0) {
      return res.status(400).json({ error: 'Price and stock cannot be negative' })
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

// Delete book
app.delete('/books/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    await prisma.book.delete({
      where: { id: parseInt(id) }
    })
    
    res.json({ message: 'Book deleted successfully' })
  } catch (error) {
    console.error('Error deleting book:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Book not found' })
    }
    res.status(500).json({ error: 'Failed to delete book' })
  }
})

// Borrow book
app.post('/borrow', async (req, res) => {
  try {
    const { userId, bookId, quantity = 1 } = req.body
    
    if (!userId || !bookId) {
      return res.status(400).json({ error: 'User ID and Book ID are required' })
    }
    
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: parseInt(bookId) }
      })
      
      if (!book) {
        throw new Error('Book not found')
      }
      
      if (book.stock < quantity) {
        throw new Error('Not enough stock available')
      }
      
      // Create borrow record
      const borrowRecord = await tx.borrowRecord.create({
        data: {
          userId: parseInt(userId),
          bookId: parseInt(bookId),
          action: 'borrow',
          quantity: parseInt(quantity)
        }
      })
      
      // Update book stock
      await tx.book.update({
        where: { id: parseInt(bookId) },
        data: { stock: book.stock - parseInt(quantity) }
      })
      
      return borrowRecord
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

// Return book
app.post('/return', async (req, res) => {
  try {
    const { userId, bookId, quantity = 1 } = req.body
    
    if (!userId || !bookId) {
      return res.status(400).json({ error: 'User ID and Book ID are required' })
    }
    
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: parseInt(bookId) }
      })
      
      if (!book) {
        throw new Error('Book not found')
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
      
      // Update book stock
      await tx.book.update({
        where: { id: parseInt(bookId) },
        data: { stock: book.stock + parseInt(quantity) }
      })
      
      return returnRecord
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

// Get borrow records
app.get('/borrow-records', async (req, res) => {
  try {
    const records = await prisma.borrowRecord.findMany({
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

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})