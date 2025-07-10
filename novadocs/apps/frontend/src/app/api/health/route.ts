// app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple health check - just return success
    // In production, you might want to check MinIO connectivity here
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'online',
        minio: 'configured' // Could check actual MinIO connection
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}