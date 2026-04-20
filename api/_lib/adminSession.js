import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'

const SESSION_EXPIRES_IN = '8h'
const resetTokens = new Map()
let runtimePasswordHash = null

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || 'archiverse-admin-session-secret'
}

function getAdminEmail() {
  return process.env.ADMIN_EMAIL || 'kanimesh187@gmail.com'
}

function getPasswordHash() {
  if (runtimePasswordHash) {
    return runtimePasswordHash
  }

  const configuredHash = process.env.ADMIN_PASSWORD_HASH
  if (configuredHash) {
    return configuredHash
  }

  const plainPassword = process.env.ADMIN_PASSWORD || 'Animesh@187'
  return bcrypt.hashSync(plainPassword, 10)
}

export async function validateAdminCredentials(email, password) {
  if (!email || !password || email !== getAdminEmail()) {
    return false
  }

  return bcrypt.compare(password, getPasswordHash())
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
