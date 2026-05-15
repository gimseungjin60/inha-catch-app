// 어드민 대시보드용 API 클라이언트.
// 기본 baseURL: NEXT_PUBLIC_API_URL (없으면 same-origin).
// 인증 토큰: sessionStorage (탭 닫으면 자동 만료). localStorage 보다 XSS 노출이 적음.
// 401 응답 시 토큰을 비우고 /login 으로 이동.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
const TOKEN_KEY = 'admin_jwt_token'
const REFRESH_KEY = 'admin_refresh_token'
const PROFILE_KEY = 'admin_profile'

export type AdminProfile = {
  email: string
  name: string
  role: 'ADMIN' | 'USER'
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function getAdminRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(REFRESH_KEY)
}

export function setAdminRefreshToken(token: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(REFRESH_KEY, token)
}

export function getAdminProfile(): AdminProfile | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminProfile
  } catch {
    return null
  }
}

export function setAdminProfile(profile: AdminProfile) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
  sessionStorage.removeItem(PROFILE_KEY)
}

// 호환성 alias (기존 호출자가 있을 경우)
export const clearAdminToken = clearAdminSession

export class AdminApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (res.status === 204) return undefined as unknown as T
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.message) msg = body.message
    } catch { /* ignore */ }

    // 401 / 403 → 세션 만료. 로그인 페이지로 보냄.
    if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined') {
      clearAdminSession()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }

    throw new AdminApiError(res.status, msg)
  }
  return res.json() as Promise<T>
}
