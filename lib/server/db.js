import { Pool } from 'pg'
import { loadServerEnv } from './env'

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