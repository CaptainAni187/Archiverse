import { methodNotAllowed, readJson, sendJson } from '../_lib/http.js'
import {
  createAdminToken,
  validateAdminCredentials,
} from '../_lib/adminSession.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
    const body = await readJson(req)
    const email = body.email?.trim()
    const password = body.password || ''

    const isValid = await validateAdminCredentials(email, password)

    if (!isValid) {
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
