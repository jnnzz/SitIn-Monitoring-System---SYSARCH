-- Create the database
CREATE DATABASE sitin_monitoring_db;

-- Connect to the database using: \c sitin_monitoring_db

-- Users table for authentication
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  course VARCHAR(255),
  year_level VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for tracking sit-in sessions
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_name VARCHAR(100) NOT NULL,
  entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

-- Insert hardcoded admin account
-- Password: admin123 (hashed with bcryptjs - 10 rounds)
DELETE FROM users WHERE email = 'admin@uc.edu.ph';
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
  'admin@uc.edu.ph',
  '$2a$10$Mb8egQvCIlfAdugfGas/z.Hubl5PvVh.RunKlzoySoLLsAu5/MiHG',
  'Admin User',
  'admin'
);
