import { NextResponse } from 'next/server'
import { getContentTypeFromName, normalizeUploadPath, readUploadBuffer } from '@/lib/server/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  const resolvedParams = await params
  const pathParts = Array.isArray(resolvedParams?.path) ? resolvedParams.path : []
  const relativePath = normalizeUploadPath(pathParts)

  if (!relativePath) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  }

  const fileBuffer = await readUploadBuffer(relativePath)
  if (!fileBuffer) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const fileName = pathParts[pathParts.length - 1]

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': getContentTypeFromName(fileName),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}