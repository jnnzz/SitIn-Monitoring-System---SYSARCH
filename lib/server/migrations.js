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

  await pool
    .query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0')
    .catch(() => {})

  await pool
    .query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reservation_enabled BOOLEAN DEFAULT FALSE')
    .catch(() => {})

  await pool
    .query(`
      CREATE TABLE IF NOT EXISTS reward_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        delta INTEGER NOT NULL,
        reason VARCHAR(255),
        source VARCHAR(50) DEFAULT 'admin',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .catch(() => {})

  await pool
    .query(`
      CREATE TABLE IF NOT EXISTS report_exports (
        id SERIAL PRIMARY KEY,
        report_type VARCHAR(50) NOT NULL,
        format VARCHAR(10) NOT NULL,
        filters TEXT,
        file_path TEXT,
        requested_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .catch(() => {})

  await pool
    .query(`
      CREATE TABLE IF NOT EXISTS labs (
        id SERIAL PRIMARY KEY,
        lab_name VARCHAR(100) UNIQUE NOT NULL,
        total_computers INTEGER DEFAULT 40,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .catch(() => {})

  await pool
    .query('ALTER TABLE labs ADD COLUMN IF NOT EXISTS reservation_enabled BOOLEAN DEFAULT TRUE')
    .catch(() => {})

  await pool
    .query('UPDATE labs SET reservation_enabled = TRUE WHERE reservation_enabled IS NULL')
    .catch(() => {})

  await pool
    .query(`
      CREATE TABLE IF NOT EXISTS lab_computers (
        id SERIAL PRIMARY KEY,
        lab_id INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
        computer_number INTEGER NOT NULL,
        is_available BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'available',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lab_id, computer_number)
      )
    `)
    .catch(() => {})

  // Backward-compatible patch for older databases that created lab_computers
  // before status/updated_at were introduced.
  await pool
    .query('ALTER TABLE lab_computers ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE')
    .catch(() => {})

  await pool
    .query("ALTER TABLE lab_computers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'available'")
    .catch(() => {})

  await pool
    .query('ALTER TABLE lab_computers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
    .catch(() => {})

  await pool
    .query(`
      UPDATE lab_computers
      SET status = CASE
        WHEN is_available = FALSE THEN 'maintenance'
        ELSE 'available'
      END
      WHERE status IS NULL
    `)
    .catch(() => {})

  await pool
    .query('UPDATE lab_computers SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL')
    .catch(() => {})

  await pool
    .query(`
      CREATE TABLE IF NOT EXISTS lab_software (
        id SERIAL PRIMARY KEY,
        lab_id INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
        software_name VARCHAR(120) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .catch(() => {})

  await pool
    .query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_software_unique_name
      ON lab_software (lab_id, LOWER(software_name))
    `)
    .catch(() => {})

  await pool
    .query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lab_id INTEGER NOT NULL REFERENCES labs(id),
        computer_id INTEGER NOT NULL REFERENCES lab_computers(id),
        date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        purpose VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        admin_notes TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lab_id, computer_id, date, time_slot)
      )
    `)
    .catch(() => {})

  await pool
    .query(`
      CREATE TABLE IF NOT EXISTS reservation_logs (
        id SERIAL PRIMARY KEY,
        reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        performed_by INTEGER NOT NULL REFERENCES users(id),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .catch(() => {})

  await pool
    .query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        status VARCHAR(20) DEFAULT 'pending',
        reviewed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .catch(() => {})

  await pool
    .query("UPDATE testimonials SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE status = 'pending'")
    .catch(() => {})

  await pool
    .query(`
      INSERT INTO labs (lab_name, total_computers)
      VALUES ('Lab 524', 40), ('Lab 526', 40), ('Lab 530', 40), ('Lab 542', 40), ('Lab 544', 40)
      ON CONFLICT (lab_name) DO NOTHING
    `)
    .catch(() => {})

  await pool
    .query(`
      INSERT INTO lab_computers (lab_id, computer_number)
      SELECT l.id, g.n
      FROM labs l
      CROSS JOIN generate_series(1, 40) AS g(n)
      ON CONFLICT (lab_id, computer_number) DO NOTHING
    `)
    .catch(() => {})

}

export function ensureMigrations() {
  if (!migrationPromise) {
    migrationPromise = runMigrations()
  }

  return migrationPromise
}
