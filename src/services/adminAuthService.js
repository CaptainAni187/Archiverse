const AUTH_KEY = 'archiverse_admin_auth'
const ADMIN_EMAIL = 'admin@archiverse.local'
const ADMIN_PASSWORD = 'archiverse123'

export function loginAdmin(email, password) {
  const isValid = email === ADMIN_EMAIL && password === ADMIN_PASSWORD

  if (!isValid) {
    return false
  }

  localStorage.setItem(AUTH_KEY, 'true')
  return true
}

export function logoutAdmin() {
  localStorage.removeItem(AUTH_KEY)
}

export function isAdminAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === 'true'
}
