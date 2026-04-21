import './loadEnv.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { getBackendConfig } from './env.js'
import { unauthorized } from './http.js'

const USER_SESSION_EXPIRES_IN = '7d'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function getUserSessionSecret() {
  return getBackendConfig().userSessionSecret || ''
}

export async function hashUserPassword(password) {
  return bcrypt.hash(password, 10)
}

export async function validateUserPassword(password, passwordHash) {
  if (!password || !passwordHash) {
    return false
  }

  return bcrypt.compare(password, passwordHash)
}

export function createUserToken(user) {
  return jwt.sign(
    {
      role: 'user',
      id: user.id,
      email: normalizeEmail(user.email),
      name: user.name,
    },
    getUserSessionSecret(),
    {
      expiresIn: USER_SESSION_EXPIRES_IN,
    },
  )
}

export function getUserSessionFromToken(token) {
  if (!token) {
    return null
  }

  try {
    return jwt.verify(token, getUserSessionSecret())
  } catch {
    return null
  }
}

export function getBearerToken(req) {
  const authHeader = req.headers.authorization || ''
  return authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
}

export function requireUserAuth(req, res) {
  const token = getBearerToken(req)

  if (!token) {
    unauthorized(res, 'User authentication required.')
    return null
  }

  const session = getUserSessionFromToken(token)

  if (!session || session.role !== 'user' || !session.email) {
    unauthorized(res, 'Invalid or expired user token.')
    return null
  }

  return session
}

export { normalizeEmail }
