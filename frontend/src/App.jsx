import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [books, setBooks] = useState([])
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const [borrowRecords, setBorrowRecords] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [activeTab, setActiveTab] = useState('books')
  const [editingBook, setEditingBook] = useState(null)
  const [form, setForm] = useState({
    title: '',
    author: '',
    price: '',
    stock: '',
    bookCategoryId: ''
  })
  const [borrowForm, setBorrowForm] = useState({
    userId: '',
    bookId: '',
    quantity: 1
  })
  const [returnForm, setReturnForm] = useState({
    userId: '',
    bookId: '',
    quantity: 1
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const API_BASE = 'http://localhost:4000'

  useEffect(() => {
    fetchCategories()
    fetchUsers()
    fetchBorrowRecords()
  }, [])

  useEffect(() => {
    fetchBooks()
  }, [selectedCategory])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const url = selectedCategory 
        ? `${API_BASE}/books?categoryId=${selectedCategory}`
        : `${API_BASE}/books`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch books')
      const data = await response.json()
      setBooks(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/categories`)
      const data = await response.json()
      setCategories(data)
    } catch (err) {
      setError('Failed to fetch categories')
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`)
      const data = await response.json()
      setUsers(data)
    } catch (err) {
      setError('Failed to fetch users')
    }
  }

  const fetchBorrowRecords = async () => {
    try {
      const response = await fetch(`${API_BASE}/borrow-records`)
      const data = await response.json()
      setBorrowRecords(data)
    } catch (err) {
      setError('Failed to fetch borrow records')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.title || !form.author) {
      setError('Title and author are required')
      return
    }

    if (!form.bookCategoryId) {
      setError('Please select a category')
      return
    }

    try {
      const url = editingBook 
        ? `${API_BASE}/books/${editingBook.id}`
        : `${API_BASE}/books`
      
      const method = editingBook ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save book')
      }

      // Reset form and refresh data
      setForm({ title: '', author: '', price: '', stock: '', bookCategoryId: '' })
      setEditingBook(null)
      fetchBooks()
      setError('')
      alert(editingBook ? 'Book updated successfully!' : 'Book added successfully!')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (book) => {
    setEditingBook(book)
    setForm({
      title: book.title,
      author: book.author,
      price: book.price.toString(),
      stock: book.stock.toString(),
      bookCategoryId: book.bookCategoryId.toString()
    })
  }

  const handleCancelEdit = () => {
    setEditingBook(null)
    setForm({ title: '', author: '', price: '', stock: '', bookCategoryId: '' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this book?')) return

    try {
      const response = await fetch(`${API_BASE}/books/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete book')

      fetchBooks()
      alert('Book deleted successfully!')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleBorrow = async (e) => {
    e.preventDefault()
    setError('')

    if (!borrowForm.userId || !borrowForm.bookId) {
      setError('Please select both user and book')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(borrowForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to borrow book')
      }

      setBorrowForm({ userId: '', bookId: '', quantity: 1 })
      fetchBooks()
      fetchBorrowRecords()
      alert('Book borrowed successfully!')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleReturn = async (e) => {
    e.preventDefault()
    setError('')

    if (!returnForm.userId || !returnForm.bookId) {
      setError('Please select both user and book')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to return book')
      }

      setReturnForm({ userId: '', bookId: '', quantity: 1 })
      fetchBooks()
      fetchBorrowRecords()
      alert('Book returned successfully!')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📚 Book Management System</h1>
        <nav className="tabs">
          <button 
            className={activeTab === 'books' ? 'active' : ''}
            onClick={() => setActiveTab('books')}
          >
            Book Management
          </button>
          <button 
            className={activeTab === 'borrow' ? 'active' : ''}
            onClick={() => setActiveTab('borrow')}
          >
            Borrow/Return
          </button>
          <button 
            className={activeTab === 'records' ? 'active' : ''}
            onClick={() => setActiveTab('records')}
          >
            Borrow Records
          </button>
        </nav>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {activeTab === 'books' && (
          <div className="tab-content">
            <section className="book-form">
              <h2>{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Title *"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Author *"
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price *"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Stock *"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    required
                  />
                  <select
                    value={form.bookCategoryId}
                    onChange={(e) => setForm({ ...form, bookCategoryId: e.target.value })}
                    required
                  >
                    <option value="">Select Category *</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    {editingBook ? 'Update Book' : 'Add Book'}
                  </button>
                  {editingBook && (
                    <button type="button" onClick={handleCancelEdit} className="btn-secondary">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="book-list">
              <div className="section-header">
                <h2>Book List</h2>
                <div className="filter">
                  <label>Filter by Category:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="loading">Loading books...</div>
              ) : (
                <div className="table-container">
                  <table className="books-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Category</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {books.map(book => (
                        <tr key={book.id} className={book.stock === 0 ? 'out-of-stock' : ''}>
                          <td>{book.title}</td>
                          <td>{book.author}</td>
                          <td>${book.price}</td>
                          <td>
                            <span className={`stock ${book.stock === 0 ? 'zero' : ''}`}>
                              {book.stock === 0 ? 'Out of Stock' : book.stock}
                            </span>
                          </td>
                          <td>{book.category.name}</td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                onClick={() => handleEdit(book)}
                                className="btn-edit"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(book.id)}
                                className="btn-delete"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {books.length === 0 && (
                    <div className="no-data">No books found</div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'borrow' && (
          <div className="tab-content">
            <div className="borrow-return-forms">
              <section className="borrow-form">
                <h2>Borrow Book</h2>
                <form onSubmit={handleBorrow}>
                  <div className="form-row">
                    <select
                      value={borrowForm.userId}
                      onChange={(e) => setBorrowForm({ ...borrowForm, userId: e.target.value })}
                      required
                    >
                      <option value="">Select User *</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                    <select
                      value={borrowForm.bookId}
                      onChange={(e) => setBorrowForm({ ...borrowForm, bookId: e.target.value })}
                      required
                    >
                      <option value="">Select Book *</option>
                      {books
                        .filter(book => book.stock > 0)
                        .map(book => (
                          <option key={book.id} value={book.id}>
                            {book.title} by {book.author} (Stock: {book.stock})
                          </option>
                        ))
                      }
                    </select>
                    <input
                      type="number"
                      placeholder="Quantity"
                      min="1"
                      value={borrowForm.quantity}
                      onChange={(e) => setBorrowForm({ ...borrowForm, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <button type="submit" className="btn-primary">
                    Borrow Book
                  </button>
                </form>
              </section>

              <section className="return-form">
                <h2>Return Book</h2>
                <form onSubmit={handleReturn}>
                  <div className="form-row">
                    <select
                      value={returnForm.userId}
                      onChange={(e) => setReturnForm({ ...returnForm, userId: e.target.value })}
                      required
                    >
                      <option value="">Select User *</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                    <select
                      value={returnForm.bookId}
                      onChange={(e) => setReturnForm({ ...returnForm, bookId: e.target.value })}
                      required
                    >
                      <option value="">Select Book *</option>
                      {books.map(book => (
                        <option key={book.id} value={book.id}>
                          {book.title} by {book.author}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Quantity"
                      min="1"
                      value={returnForm.quantity}
                      onChange={(e) => setReturnForm({ ...returnForm, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <button type="submit" className="btn-primary">
                    Return Book
                  </button>
                </form>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="tab-content">
            <section className="records-section">
              <h2>Borrow/Return Records</h2>
              <div className="table-container">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Book</th>
                      <th>Action</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowRecords.map(record => (
                      <tr key={record.id} className={`action-${record.action}`}>
                        <td>{new Date(record.createdAt).toLocaleString()}</td>
                        <td>{record.user.name}</td>
                        <td>{record.book.title}</td>
                        <td>
                          <span className={`action-badge ${record.action}`}>
                            {record.action.toUpperCase()}
                          </span>
                        </td>
                        <td>{record.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {borrowRecords.length === 0 && (
                  <div className="no-data">No borrow/return records found</div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default App