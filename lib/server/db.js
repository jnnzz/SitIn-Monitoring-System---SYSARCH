import { Pool, types } from 'pg'
import { loadServerEnv } from './env'

// ── Override pg type parsers to return raw strings instead of JS Date objects ──
// DATE (OID 1082): prevents '2026-05-24' → new Date(2026,4,24) timezone shift
types.setTypeParser(1082, (val) => val)   // DATE  → raw string "2026-05-24"
// TIMESTAMP (OID 1114): prevents local timezone interpretation
types.setTypeParser(1114, (val) => val)   // TIMESTAMP → raw string
// TIMESTAMPTZ (OID 1184): keep as raw ISO string
types.setTypeParser(1184, (val) => val)   // TIMESTAMPTZ → raw string

loadServerEnv()

const globalForDb = globalThis

function buildPoolConfig() {
  const parsedPort = Number.parseInt(process.env.DB_PORT || '5432', 10)

  return {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number.isNaN(parsedPort) ? 5432 : parsedPort,
  }
}

if (!globalForDb.__sitinDbPool) {
  globalForDb.__sitinDbPool = new Pool(buildPoolConfig())
  globalForDb.__sitinDbPool.on('error', (err) => {
    console.error('Unexpected error on idle client', err)
  })
}

export const pool = globalForDb.__sitinDbPool