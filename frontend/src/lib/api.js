export const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api')

export function getToken() {
  return localStorage.getItem('vinlab-access-token') || ''
}

export function setSession(accessToken, user) {
  localStorage.setItem('vinlab-access-token', accessToken)
  localStorage.setItem('vinlab-user', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('vinlab-access-token')
  localStorage.removeItem('vinlab-user')
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('vinlab-user') || 'null')
  } catch {
    return null
  }
}

export function authHeaders(extra = {}) {
  const token = getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

export async function api(path, options = {}) {
  const headers = authHeaders({
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  })
  const res = await fetch(`${API}${path}`, { ...options, headers })
  if (res.status === 401) {
    clearSession()
    window.dispatchEvent(new Event('vinlab-auth-expired'))
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || 'Yêu cầu không thành công')
  }
  return res.json()
}
