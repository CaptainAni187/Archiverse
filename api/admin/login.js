import { methodNotAllowed, readJson, sendJson } from '../_lib/http.js'
import {
  createAdminToken,
  getAdminEmail,
  validateAdminCredentials,
} from '../_lib/adminSession.js'
import { getClientIp, consumeRateLimit } from '../_lib/rateLimit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
    const body = await readJson(req)
    const email = String(body.email || '').trim().toLowerCase()
    const password = body.password || ''
    console.log('ENV CHECK:', process.env.ADMIN_EMAIL)
    const ipAddress = getClientIp(req)
    const rateLimit = consumeRateLimit(`admin-login:${ipAddress}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
      return sendJson(res, 429, {
        success: false,
        message: 'Too many admin login attempts. Please try again later.',
      })
    }

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
      return sendJson(res, 500, {
        success: false,
        message: 'Admin authentication environment variables are not configured.',
      })
    }

    const isValid = await validateAdminCredentials(email, password)

    if (!isValid) {
      console.warn(
        `[admin-auth] Failed login attempt for ${email || 'unknown-email'} from ${ipAddress}. Expected ${getAdminEmail() || 'unconfigured-admin-email'}.`,
      )
      return sendJson(res, 401, {
        success: false,
        message: 'Invalid admin credentials.',
      })
    }

    const token = createAdminToken()
    return sendJson(res, 200, { success: true, token })
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      message: error.message || 'Unable to sign in.',
    })
  }
}
