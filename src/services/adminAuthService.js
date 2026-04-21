const ADMIN_TOKEN_KEY = 'archiverse_admin_token'

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

async function parseAuthResponse(response) {
  const rawText = await response.text()
  let payload = null

  try {
    payload = rawText ? JSON.parse(rawText) : null
  } catch {
    throw new Error(`Server error (${response.status}). Admin API may be unavailable.`)
  }

  if (!payload || !response.ok || payload.success === false) {
    throw new Error(payload?.message || `Server error (${response.status}).`)
  }

  return payload
}

export async function loginAdmin(email, password) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })

  const payload = await parseAuthResponse(response)
  if (!payload.token) {
    throw new Error('Server error')
  }
  localStorage.setItem(ADMIN_TOKEN_KEY, payload.token)
  return true
}

export async function logoutAdmin() {
  const token = getAdminToken()
  const response = await fetch('/api/admin/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  })

  await parseAuthResponse(response)
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  return true
}

export async function isAdminAuthenticated() {
  try {
    const token = getAdminToken()
    if (!token) {
      return false
    }

    const response = await fetch('/api/admin/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const payload = await parseAuthResponse(response)
    return payload.authenticated === true
  } catch {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    return false
  }
}

export async function requestAdminPasswordReset(email) {
  const response = await fetch('/api/admin/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  return parseAuthResponse(response)
}

export async function resetAdminPassword(email, token, newPassword) {
  const response = await fetch('/api/admin/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      token,
      new_password: newPassword,
    }),
  })

  return parseAuthResponse(response)
}
