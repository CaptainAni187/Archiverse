import { backendRequest } from './backendApiService'

const USER_TOKEN_KEY = 'archiverse_user_token'
const USER_PROFILE_KEY = 'archiverse_user_profile'

function storeSession(payload) {
  localStorage.setItem(USER_TOKEN_KEY, payload.token)
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(payload.user))
  return payload.user
}

export function getUserToken() {
  return localStorage.getItem(USER_TOKEN_KEY)
}

export function getStoredUser() {
  const rawUser = localStorage.getItem(USER_PROFILE_KEY)

  try {
    return rawUser ? JSON.parse(rawUser) : null
  } catch {
    return null
  }
}

export async function signupUser({ name, email, password }) {
  const payload = await backendRequest('/api/user/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })

  return storeSession(payload)
}

export async function loginUser({ email, password }) {
  const payload = await backendRequest('/api/user/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  return storeSession(payload)
}

export async function logoutUser() {
  await backendRequest('/api/user/logout', {
    method: 'POST',
  })
  localStorage.removeItem(USER_TOKEN_KEY)
  localStorage.removeItem(USER_PROFILE_KEY)
}

export async function fetchCurrentUser() {
  const token = getUserToken()

  if (!token) {
    return null
  }

  try {
    const payload = await backendRequest('/api/user/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(payload.user))
    return payload.user
  } catch {
    localStorage.removeItem(USER_TOKEN_KEY)
    localStorage.removeItem(USER_PROFILE_KEY)
    return null
  }
}

export async function fetchUserOrders() {
  const token = getUserToken()
  const payload = await backendRequest('/api/user/orders', {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  })

  return payload.orders
}
