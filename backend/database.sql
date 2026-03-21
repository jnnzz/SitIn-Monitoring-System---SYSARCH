CREATE DATABASE sitin_monitoring_db;


CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  course VARCHAR(255),
  year_level VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_name VARCHAR(100) NOT NULL,
  entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

-- Insert hardcoded admin account
-- Password: admin123 (hashed with bcryptjs - 10 rounds)
DELETE FROM users WHERE student_id = 'ADMIN001';
INSERT INTO users (student_id, password_hash, full_name, role)
VALUES (
  'ADMIN001',
  '$2a$10$Mb8egQvCIlfAdugfGas/z.Hubl5PvVh.RunKlzoySoLLsAu5/MiHG',
  'Admin User',
  'admin'
);
