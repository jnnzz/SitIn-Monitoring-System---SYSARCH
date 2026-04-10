import path from 'node:path'
import { promises as fs } from 'node:fs'

export const ROOT_UPLOAD_DIR = path.join(process.cwd(), 'uploads')
export const LEGACY_UPLOAD_DIR = path.join(process.cwd(), 'backend', 'uploads')

const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

export async function ensureRootUploadDir() {
  await fs.mkdir(ROOT_UPLOAD_DIR, { recursive: true })
}

export function isAllowedImageFileName(fileName) {
  const ext = path.extname(fileName || '').toLowerCase()
  return allowedImageExtensions.has(ext)
}

export function extractUploadFileName(avatarUrl) {
  if (!avatarUrl) return null

  try {
    const parsed = new URL(avatarUrl)
    return path.basename(parsed.pathname)
  } catch (_) {
    return path.basename(avatarUrl)
  }
}

export function resolveRootUploadFile(fileName) {
  return path.join(ROOT_UPLOAD_DIR, fileName)
}

export async function deleteUploadFile(fileName) {
  if (!fileName) return

  for (const baseDir of [ROOT_UPLOAD_DIR, LEGACY_UPLOAD_DIR]) {
    const filePath = path.join(baseDir, fileName)
    try {
      await fs.unlink(filePath)
    } catch (_) {
      // Ignore delete failures for files that do not exist.
    }
  }
}

export function normalizeUploadPath(pathParts) {
  if (!Array.isArray(pathParts) || pathParts.length === 0) return null

  const relativePath = path.normalize(path.join(...pathParts))
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null

  return relativePath
}

export function getContentTypeFromName(fileName) {
  const ext = path.extname(fileName || '').toLowerCase()

  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'

  return 'application/octet-stream'
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath)
  } catch (_) {
    return null
  }
}

export async function readUploadBuffer(relativePath) {
  const rootFile = path.join(ROOT_UPLOAD_DIR, relativePath)
  const rootBuffer = await readIfExists(rootFile)
  if (rootBuffer) return rootBuffer

  const legacyFile = path.join(LEGACY_UPLOAD_DIR, relativePath)
  const legacyBuffer = await readIfExists(legacyFile)
  return legacyBuffer
}