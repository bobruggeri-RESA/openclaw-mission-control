import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const AUTH_COOKIE = 'mc-auth'
const TOKEN_EXPIRY = '7d'

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || 'fallback-secret-please-change'
  return new TextEncoder().encode(secret)
}

export async function createToken(): Promise<string> {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(AUTH_COOKIE)?.value
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken()
  if (!token) return false
  return verifyToken(token)
}

export function checkPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme'
  return password === adminPassword
}

export const AUTH_COOKIE_NAME = AUTH_COOKIE
