import './loadEnv.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { unauthorized } from './http.js'

const SESSION_EXPIRES_IN = '1h'
const resetTokens = new Map()
let runtimePasswordHash = null

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || ''
}

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
}

function getPasswordHash() {
  if (runtimePasswordHash) {
    return runtimePasswordHash
  }

  const plainPassword = process.env.ADMIN_PASSWORD || ''
  return plainPassword ? bcrypt.hashSync(plainPassword, 10) : ''
}

export async function validateAdminCredentials(email, password) {
  const normalizedInputEmail = String(email || '').trim().toLowerCase()

  if (!normalizedInputEmail || !password || normalizedInputEmail !== getAdminEmail()) {
    return false
  }

  const passwordHash = getPasswordHash()
  if (!passwordHash) {
    return false
  }

  return bcrypt.compare(password, passwordHash)
}

export function createAdminToken() {
  return jwt.sign({ role: 'admin', email: getAdminEmail() }, getSessionSecret(), {
    expiresIn: SESSION_EXPIRES_IN,
  })
}

export function getAdminSessionFromToken(token) {
  if (!token) {
    return null
  }

  try {
    return jwt.verify(token, getSessionSecret())
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

export function requireAdminAuth(req, res) {
  const token = getBearerToken(req)

  if (!token) {
    unauthorized(res, 'Admin authentication required.')
    return null
  }

  const session = getAdminSessionFromToken(token)

  if (!session || session.role !== 'admin' || session.email !== getAdminEmail()) {
    unauthorized(res, 'Invalid or expired admin token.')
    return null
  }

  return session
}

export function createPasswordResetToken(email) {
  const token = crypto.randomBytes(20).toString('hex')
  resetTokens.set(token, {
    email,
    expiresAt: Date.now() + 1000 * 60 * 30,
  })
  return token
}

export function consumePasswordResetToken(token, email) {
  const entry = resetTokens.get(token)
  if (!entry) {
    return false
  }
  if (entry.expiresAt < Date.now() || entry.email !== email) {
    resetTokens.delete(token)
    return false
  }

  resetTokens.delete(token)
  return true
}

export function updateAdminPassword(newPassword) {
  runtimePasswordHash = bcrypt.hashSync(newPassword, 10)
}

export { getAdminEmail }
