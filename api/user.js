import { getBackendConfig, requireConfigValues } from './_lib/env.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import {
  createUserToken,
  hashUserPassword,
  normalizeEmail,
  requireUserAuth,
  validateUserPassword,
} from './_lib/userSession.js'
import {
  createUserAccount,
  fetchOrdersByCustomerEmail,
  fetchUserByEmail,
} from './_lib/supabaseAdmin.js'

function getAction(req) {
  return String(req.query?.action || '').trim().toLowerCase()
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: normalizeEmail(user.email),
  }
}

function normalizeOrder(order) {
  return {
    ...order,
    total_amount: Number(order.total_amount),
    advance_amount: Number(order.advance_amount),
    processing_at: order.processing_at || null,
    shipped_at: order.shipped_at || null,
    delivered_at: order.delivered_at || null,
  }
}

function requireUserSessionSecret() {
  requireConfigValues({
    USER_SESSION_SECRET: getBackendConfig().userSessionSecret,
  })
}

async function handleSignup(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  requireUserSessionSecret()

  const body = await readJson(req)
  const name = String(body.name || '').trim()
  const email = normalizeEmail(body.email)
  const password = String(body.password || '')

  if (!name || !email || !password) {
    return sendJson(res, 400, {
      success: false,
      message: 'Name, email, and password are required.',
    })
  }

  if (password.length < 8) {
    return sendJson(res, 400, {
      success: false,
      message: 'Password must be at least 8 characters.',
    })
  }

  const existingUser = await fetchUserByEmail(email)
  if (existingUser) {
    return sendJson(res, 409, {
      success: false,
      message: 'An account already exists for this email.',
    })
  }

  const user = await createUserAccount({
    name,
    email,
    password_hash: await hashUserPassword(password),
  })

  const safeUser = serializeUser(user)

  return sendJson(res, 201, {
    success: true,
    token: createUserToken(safeUser),
    user: safeUser,
  })
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  requireUserSessionSecret()

  const body = await readJson(req)
  const email = normalizeEmail(body.email)
  const password = String(body.password || '')
  const user = await fetchUserByEmail(email)
  const isValid = await validateUserPassword(password, user?.password_hash)

  if (!user || !isValid) {
    return sendJson(res, 401, {
      success: false,
      message: 'Invalid email or password.',
    })
  }

  const safeUser = serializeUser(user)

  return sendJson(res, 200, {
    success: true,
    token: createUserToken(safeUser),
    user: safeUser,
  })
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  return sendJson(res, 200, {
    success: true,
    message: 'Logged out.',
  })
}

async function handleMe(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const session = requireUserAuth(req, res)
  if (!session) {
    return null
  }

  return sendJson(res, 200, {
    success: true,
    authenticated: true,
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
    },
  })
}

async function handleOrders(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const session = requireUserAuth(req, res)
  if (!session) {
    return null
  }

  const orders = await fetchOrdersByCustomerEmail(session.email)

  return sendJson(res, 200, {
    success: true,
    orders: orders.map(normalizeOrder),
  })
}

export default async function handler(req, res) {
  try {
    const action = getAction(req)

    if (action === 'signup') {
      return await handleSignup(req, res)
    }

    if (action === 'login') {
      return await handleLogin(req, res)
    }

    if (action === 'logout') {
      return await handleLogout(req, res)
    }

    if (action === 'me') {
      return await handleMe(req, res)
    }

    if (action === 'orders') {
      return await handleOrders(req, res)
    }

    return sendJson(res, 404, {
      success: false,
      message: 'User route not found.',
    })
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to process user request.',
    })
  }
}
