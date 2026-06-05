import { NextResponse } from 'next/server'

const COOKIE_NAME = 'op_session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function POST(req) {
  const { password } = await req.json()

  if (!process.env.OPERATOR_SECRET || password !== process.env.OPERATOR_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, process.env.OPERATOR_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
  return res
}
