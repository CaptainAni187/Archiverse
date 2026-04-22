import {
  consumePasswordResetToken,
  createAdminToken,
  createPasswordResetToken,
  getAdminEmail,
  requireAdminAuth,
  updateAdminPassword,
  validateAdminCredentials,
} from './_lib/adminSession.js'
import { getClientIp, consumeRateLimit } from './_lib/rateLimit.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { fetchOrderAnalyticsRows } from './_lib/supabaseAdmin.js'

const REVENUE_STATUSES = ['advance_paid', 'processing', 'shipped', 'delivered']

function getAction(req) {
  return String(req.query?.action || '').trim().toLowerCase()
}

function toDateKey(value) {
  const date = value ? new Date(value) : new Date()

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function getLastSevenDayKeys(now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - (6 - index))
    return date.toISOString().slice(0, 10)
  })
}

function buildDashboardAnalytics(orders) {
  const successfulOrders = orders.filter((order) =>
    REVENUE_STATUSES.includes(order.payment_status),
  )
  const ordersByDay = new Map()

  orders.forEach((order) => {
    const dateKey = toDateKey(order.created_at)
    ordersByDay.set(dateKey, (ordersByDay.get(dateKey) || 0) + 1)
  })

  return {
    total_orders: orders.length,
    total_revenue: successfulOrders.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0,
    ),
    advance_revenue: successfulOrders.reduce(
      (sum, order) => sum + Number(order.advance_amount || 0),
      0,
    ),
    artwork_sales_count: successfulOrders.length,
    unique_artworks_sold: new Set(
      successfulOrders.map((order) => order.product_id).filter(Boolean),
    ).size,
    orders_per_day: getLastSevenDayKeys().map((date) => ({
      date,
      count: ordersByDay.get(date) || 0,
    })),
  }
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  const body = await readJson(req)
  const email = String(body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const ipAddress = getClientIp(req)
  const rateLimit = consumeRateLimit(`admin-login:${ipAddress}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  })

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
    return sendJson(res, 429, {
      success: false,
      error: 'RATE_LIMITED',
      message: 'Too many admin login attempts. Please try again later.',
    })
  }

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return sendJson(res, 500, {
      success: false,
      error: 'ADMIN_CONFIG_MISSING',
      message: 'Admin authentication environment variables are not configured.',
    })
  }

  const isValid = await validateAdminCredentials(email, password)

  if (!isValid) {
    console.warn(`[admin-auth] Failed login attempt for ${email || 'unknown-email'} from ${ipAddress}.`)
    return sendJson(res, 401, {
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid admin credentials.',
    })
  }

  const token = createAdminToken()
  return sendJson(res, 200, {
    success: true,
    token,
    data: {
      token,
    },
  })
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  if (!requireAdminAuth(req, res)) {
    return null
  }

  return sendJson(res, 200, { success: true, data: { loggedOut: true } })
}

async function handleMe(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const session = requireAdminAuth(req, res)
  if (!session) {
    return null
  }

  return sendJson(res, 200, {
    success: true,
    data: {
      authenticated: true,
      admin: {
        email: session.email,
        role: session.role,
      },
      expires_at:
        typeof session.exp === 'number' ? new Date(session.exp * 1000).toISOString() : null,
    },
  })
}

async function handleForgotPassword(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  const body = await readJson(req)
  const email = body.email?.trim()

  if (!email || email !== getAdminEmail()) {
    return sendJson(res, 404, {
      success: false,
      error: 'EMAIL_NOT_FOUND',
      message: 'Email not found.',
    })
  }

  const resetToken = createPasswordResetToken(email)

  return sendJson(res, 200, {
    success: true,
    data: {
      resetToken,
      message:
        'Use this temporary reset token to verify ownership, then update ADMIN_PASSWORD in backend env.',
    },
  })
}

async function handleResetPassword(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  const body = await readJson(req)
  const email = body.email?.trim()
  const token = body.token?.trim()
  const newPassword = body.new_password || ''

  if (!email || !token || !newPassword) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Email, token, and new_password are required.',
    })
  }

  if (email !== getAdminEmail()) {
    return sendJson(res, 401, {
      success: false,
      error: 'INVALID_RESET_REQUEST',
      message: 'Invalid reset request.',
    })
  }

  if (newPassword.length < 8) {
    return sendJson(res, 400, {
      success: false,
      error: 'WEAK_PASSWORD',
      message: 'New password must be at least 8 characters.',
    })
  }

  const tokenValid = consumePasswordResetToken(token, email)
  if (!tokenValid) {
    return sendJson(res, 401, {
      success: false,
      error: 'INVALID_RESET_TOKEN',
      message: 'Reset token is invalid or expired.',
    })
  }

  updateAdminPassword(newPassword)

  return sendJson(res, 200, {
    success: true,
    data: {
      message:
        'Password reset successful for current runtime. Persist in backend env for long-term usage.',
    },
  })
}

async function handleDashboard(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  if (!requireAdminAuth(req, res)) {
    return null
  }

  const orders = await fetchOrderAnalyticsRows()
  return sendJson(res, 200, {
    success: true,
    data: buildDashboardAnalytics(orders),
  })
}

export default async function handler(req, res) {
  try {
    const action = getAction(req)

    if (action === 'login') {
      return await handleLogin(req, res)
    }

    if (action === 'logout') {
      return await handleLogout(req, res)
    }

    if (action === 'me' || action === 'session') {
      return await handleMe(req, res)
    }

    if (action === 'forgot-password') {
      return await handleForgotPassword(req, res)
    }

    if (action === 'reset-password') {
      return await handleResetPassword(req, res)
    }

    if (action === 'dashboard') {
      return await handleDashboard(req, res)
    }

    return sendJson(res, 404, {
      success: false,
      error: 'ROUTE_NOT_FOUND',
      message: 'Admin route not found.',
    })
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      error: error.error || 'ADMIN_REQUEST_FAILED',
      message: error.message || 'Unable to process admin request.',
    })
  }
}
