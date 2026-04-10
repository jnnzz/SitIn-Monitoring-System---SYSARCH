import { NextResponse } from 'next/server'
import { loadServerEnv } from '@/lib/server/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  loadServerEnv()

  return NextResponse.json({
    status: 'Backend is running',
    timestamp: new Date(),
    jwtConfigured: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET?.length || 0,
  })
}