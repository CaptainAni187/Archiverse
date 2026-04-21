import { methodNotAllowed, readJson, sendJson } from '../_lib/http.js'
import { getBackendConfig, requireConfigValues } from '../_lib/env.js'
import {
  createUserToken,
  hashUserPassword,
  normalizeEmail,
} from '../_lib/userSession.js'
import {
  createUserAccount,
  fetchUserByEmail,
} from '../_lib/supabaseAdmin.js'

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: normalizeEmail(user.email),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
    requireConfigValues({
      USER_SESSION_SECRET: getBackendConfig().userSessionSecret,
    })

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
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to create user account.',
    })
  }
}
