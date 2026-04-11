import { pool } from './db'

let migrationPromise = null

async function runMigrations() {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)').catch(() => {})

  await pool
    .query('ALTER TABLE users ADD COLUMN IF NOT EXISTS remaining_sessions INT DEFAULT 30')
    .catch(() => {})

  await pool
    .query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'")
    .catch(() => {})

  await pool
    .query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)')
    .catch(() => {})

  await pool
    .query(`
      CREATE TABLE IF NOT EXISTS active_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lab_name VARCHAR(100) DEFAULT 'Computer Lab',
        purpose VARCHAR(255),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .catch(() => {})

  await pool
    .query(`
      CREATE TABLE IF NOT EXISTS sit_in_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_id VARCHAR(50),
        full_name VARCHAR(255),
        lab_name VARCHAR(100),
        purpose VARCHAR(255),
        started_at TIMESTAMP,
        ended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_minutes INTEGER
      )
    `)
    .catch(() => {})

  await pool
    .query('ALTER TABLE sit_in_records ADD COLUMN IF NOT EXISTS feedback TEXT')
    .catch(() => {})

  await pool
    .query('ALTER TABLE sit_in_records ADD COLUMN IF NOT EXISTS rating INTEGER')
    .catch(() => {})

  await pool
    .query('ALTER TABLE sit_in_records ADD COLUMN IF NOT EXISTS admin_feedback TEXT')
    .catch(() => {})

  await pool
    .query('ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP')
    .catch(() => {})

}

export function ensureMigrations() {
  if (!migrationPromise) {
    migrationPromise = runMigrations()
  }

  return migrationPromise
}