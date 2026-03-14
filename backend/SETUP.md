# SitIn Monitoring System - Backend Setup Guide

## Overview
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs

---

## 📋 Prerequisites
1. **Node.js** installed (v14+)
2. **PostgreSQL** installed and running
3. **npm** or **yarn** package manager

---

## 🗄️ Step 1: Create PostgreSQL Database

### Windows/macOS/Linux:
```bash
# Open PostgreSQL terminal
psql -U postgres

# Run the database setup script
\i backend/database.sql

# Verify database created
\l

# Connect to the new database
\c sitin_monitoring_db

# View created tables
\dt
```

---

## 🔧 Step 2: Setup Backend Environment

### 1. Navigate to backend folder:
```bash
cd sit_in_monitoring/backend
```

### 2. Create `.env` file (copy from `.env.example`):
```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

### 3. Update `.env` with your PostgreSQL credentials:
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=sitin_monitoring_db
DB_PASSWORD=your_postgres_password
DB_PORT=5432
JWT_SECRET=your_super_secret_key_change_this
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 4. Install dependencies:
```bash
npm install
```

---

## ▶️ Step 3: Run the Backend Server

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

Expected output:
```
✅ Database connected successfully
🚀 Server running on http://localhost:5000
📡 API endpoint: http://localhost:5000/api
```

---

## 🔌 Step 4: Connect Frontend to Backend

### Update your Next.js environment variables

Create `.env.local` in your `sit_in_monitoring/` folder:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Example: Update your Login component

```javascript
// In your Login.jsx
const handleLogin = async (email, password) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      console.error('Login failed:', data.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 📡 API Endpoints

### 1. **Register User**
```
POST http://localhost:5000/api/auth/register

Body:
{
  "email": "user@school.edu",
  "password": "password123",
  "full_name": "John Doe"
}

Response:
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@school.edu",
    "full_name": "John Doe"
  },
  "token": "eyJhbGc..."
}
```

### 2. **Login User**
```
POST http://localhost:5000/api/auth/login

Body:
{
  "email": "user@school.edu",
  "password": "password123"
}

Response:
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@school.edu",
    "full_name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGc..."
}
```

### 3. **Get User Profile** (requires token)
```
GET http://localhost:5000/api/auth/profile
Headers:
Authorization: Bearer eyJhbGc...

Response:
{
  "id": 1,
  "email": "user@school.edu",
  "full_name": "John Doe",
  "role": "user",
  "created_at": "2026-03-14T10:30:00.000Z"
}
```

### 4. **Health Check**
```
GET http://localhost:5000/api/health

Response:
{
  "status": "Backend is running",
  "timestamp": "2026-03-14T10:30:00.000Z"
}
```

---

## 🛡️ Security Notes

1. **Never commit `.env` file** - add to `.gitignore`
2. **Change JWT_SECRET** in production
3. **Use HTTPS** in production
4. **Passwords are hashed** with bcryptjs (10 rounds)
5. **Tokens expire** after 24 hours

---

## 🧪 Testing with Postman/cURL

### Test Register:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@school.edu",
    "password": "test123",
    "full_name": "Test User"
  }'
```

### Test Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@school.edu",
    "password": "test123"
  }'
```

---

## 📁 Folder Structure
```
sit_in_monitoring/
├── backend/
│   ├── index.js              # Main server file
│   ├── db.js                 # Database connection
│   ├── package.json          # Dependencies
│   ├── .env.example          # Environment template
│   ├── database.sql          # Database setup script
│   └── routes/
│       └── auth.js           # Authentication endpoints
├── app/
│   ├── landing/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   └── ...
└── ...
```

---

## ✅ Summary
1. ✅ Create PostgreSQL database and tables
2. ✅ Set up Node.js backend with Express
3. ✅ Configure environment variables
4. ✅ Install dependencies
5. ✅ Run backend server
6. ✅ Connect frontend to backend
7. ✅ Test authentication endpoints

**Backend is ready to use with your React/Next.js frontend!** 🚀
