# 📚 Book Management System

A full-stack Book Management System with React frontend and Node.js/Express backend.

## 🛠️ Tech Stack
- **Frontend**: React, CSS
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL (Neon)

## ⚡ Quick Start

### 1. Backend Setup
```bash
cd backend
npm install

# Setup environment - REPLACE WITH YOUR DATABASE URL
echo 'DATABASE_URL="your-neon-database-url-here"' > .env
echo 'PORT=4000' >> .env

# Setup database
npx prisma generate
npx prisma db push
npm run db:seed

# Start server
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Access Points
After starting both servers, access the application at:

Frontend Application: http://localhost:3000

Backend API: http://localhost:4000

## 📖 Features
- ✅ Add, edit, delete books
- ✅ Filter by categories  
- ✅ Borrow/return system
- ✅ Stock management
- ✅ Responsive design

## 🔗 API Endpoints
- `GET /books` - List books
- `POST /books` - Add book
- `PUT /books/:id` - Update book
- `DELETE /books/:id` - Delete book
- `POST /borrow` - Borrow book
- `POST /return` - Return book

## 🗃️ Database
Uses Neon PostgreSQL with Prisma ORM. Includes:
- Books, Categories, Users, Borrow Records tables
- Automatic stock management
- Transaction history

---
