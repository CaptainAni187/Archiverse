import { methodNotAllowed, readJson, sendJson } from '../_lib/http.js'
import { getBackendConfig, requireConfigValues } from '../_lib/env.js'
import {
  createUserToken,
  normalizeEmail,
  validateUserPassword,
} from '../_lib/userSession.js'
import { fetchUserByEmail } from '../_lib/supabaseAdmin.js'

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
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to login.',
    })
  }
}
