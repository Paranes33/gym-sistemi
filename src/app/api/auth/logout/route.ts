import { NextResponse } from 'next/server'

export async function POST() {
  // In a real app, invalidate the session token
  return NextResponse.json({ success: true })
}
