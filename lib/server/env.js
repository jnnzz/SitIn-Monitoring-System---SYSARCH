import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

let hasLoadedEnv = false

export function loadServerEnv() {
  if (hasLoadedEnv) return

  dotenv.config({ quiet: true })

  const legacyEnvPath = path.join(process.cwd(), 'backend', '.env')
  if (fs.existsSync(legacyEnvPath)) {
    dotenv.config({ path: legacyEnvPath, override: false, quiet: true })
  }

  hasLoadedEnv = true
}