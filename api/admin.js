import {
  consumePasswordResetToken,
  createAdminToken,
  createPasswordResetToken,
  createAdminSessionRecord,
  findAdminByEmail,
  logoutAdminSession,
  requireAdminAuth,
  updateAdminPassword,
  validateAdminCredentials,
} from './_lib/adminSession.js'
import { fetchAdminActivity, logAdminActivity } from './_lib/adminActivity.js'
import { getClientIp, consumeRateLimit } from './_lib/rateLimit.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { fetchOrderAnalyticsRows } from './_lib/supabaseAdmin.js'

const REVENUE_STATUSES = ['advance_paid', 'processing', 'shipped', 'delivered']

function getAction(req) {
  return String(req.query?.action || '').trim().toLowerCase()
}

function getPathname(req) {
  const rawUrl = String(req.url || '').trim()

  if (!rawUrl) {
    return ''
  }

  try {
    return new URL(rawUrl, 'http://localhost').pathname.toLowerCase()
  } catch {
    return rawUrl.split('?')[0].toLowerCase()
  }
}

function matchesAdminRoute(pathname, route) {
  if (!pathname || !route) {
    return false
  }

  return pathname === route || pathname.endsWith(route)
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

  if (!process.env.ADMIN_SESSION_SECRET) {
    return sendJson(res, 500, {
      success: false,
      error: 'ADMIN_CONFIG_MISSING',
      message: 'Admin authentication environment variables are not configured.',
    })
  }

  const admin = await validateAdminCredentials(email, password)

  if (!admin) {
    console.warn(`[admin-auth] Failed login attempt for ${email || 'unknown-email'} from ${ipAddress}.`)
    return sendJson(res, 401, {
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid admin credentials.',
    })
  }

  const session = await createAdminSessionRecord(admin, req)
  const token = createAdminToken(admin, session)

  await logAdminActivity(
    {
      admin_id: admin.id,
      session_id: session.id,
      name: admin.name,
      email: admin.email,
    },
    {
      action_type: 'login',
      resource_type: 'admin_session',
      resource_id: session.id || session.session_token_id,
      details: {
        auth_source: admin.auth_source,
      },
    },
  )

  return sendJson(res, 200, {
    success: true,
    token,
    data: {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    },
  })
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  const session = await requireAdminAuth(req, res)
  if (!session) {
    return null
  }

  await logoutAdminSession(session)
  await logAdminActivity(session, {
    action_type: 'logout',
    resource_type: 'admin_session',
    resource_id: session.session_id || session.session_token_id,
  })

  return sendJson(res, 200, { success: true, data: { loggedOut: true } })
}

async function handleMe(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const session = await requireAdminAuth(req, res)
  if (!session) {
    return null
  }

  return sendJson(res, 200, {
    success: true,
    data: {
      authenticated: true,
      admin: {
        id: session.admin_id,
        name: session.name,
        email: session.email,
        role: session.role,
      },
      login_at: session.login_at || null,
      expires_at:
        typeof session.exp === 'number' ? new Date(session.exp * 1000).toISOString() : null,
    },
  })
}

async function handleActivity(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const session = await requireAdminAuth(req, res)
  if (!session) {
    return null
  }

  const activity = await fetchAdminActivity(50)
  return sendJson(res, 200, {
    success: true,
    data: activity,
  })
}

async function handleForgotPassword(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  const body = await readJson(req)
  const email = body.email?.trim()

  const admin = await findAdminByEmail(email)

  if (!email || !admin) {
    return sendJson(res, 404, {
      success: false,
      error: 'EMAIL_NOT_FOUND',
      message: 'Email not found.',
    })
  }

  const resetToken = createPasswordResetToken(admin)

  return sendJson(res, 200, {
    success: true,
    data: {
      resetToken,
      message:
        'Use this temporary reset token to verify ownership, then submit the password reset request.',
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

  if (newPassword.length < 8) {
    return sendJson(res, 400, {
      success: false,
      error: 'WEAK_PASSWORD',
      message: 'New password must be at least 8 characters.',
    })
  }

  const admin = consumePasswordResetToken(token, email)
  if (!admin) {
    return sendJson(res, 401, {
      success: false,
      error: 'INVALID_RESET_TOKEN',
      message: 'Reset token is invalid or expired.',
    })
  }

  await updateAdminPassword(admin, newPassword)

  return sendJson(res, 200, {
    success: true,
    data: {
      message: 'Password reset successful.',
    },
  })
}

async function handleDashboard(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const session = await requireAdminAuth(req, res)
  if (!session) {
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
    const pathname = getPathname(req)
    const action = getAction(req)

    if (matchesAdminRoute(pathname, '/login') && req.method === 'POST') {
      return await handleLogin(req, res)
    }

    if (matchesAdminRoute(pathname, '/logout') && req.method === 'POST') {
      return await handleLogout(req, res)
    }

    if (
      (matchesAdminRoute(pathname, '/me') || matchesAdminRoute(pathname, '/session')) &&
      req.method === 'GET'
    ) {
      return await handleMe(req, res)
    }

    if (matchesAdminRoute(pathname, '/forgot-password')) {
      return await handleForgotPassword(req, res)
    }

    if (matchesAdminRoute(pathname, '/reset-password')) {
      return await handleResetPassword(req, res)
    }

    if (matchesAdminRoute(pathname, '/dashboard')) {
      return await handleDashboard(req, res)
    }

    if (matchesAdminRoute(pathname, '/activity')) {
      return await handleActivity(req, res)
    }

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

    if (action === 'activity') {
      return await handleActivity(req, res)
    }

    return sendJson(res, 405, {
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed.',
    })
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      error: error.error || 'ADMIN_REQUEST_FAILED',
      message: error.message || 'Unable to process admin request.',
    })
  }
}
