import { NextRequest, NextResponse } from 'next/server'
import { checkPassword, createToken, AUTH_COOKIE_NAME } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!checkPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = await createToken()
    const response = NextResponse.json({ ok: true })

    // Only use secure cookies when served over HTTPS
    const isHttps = request.headers.get('x-forwarded-proto') === 'https' ||
      request.nextUrl.protocol === 'https:'

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 }
    )
  }
}
