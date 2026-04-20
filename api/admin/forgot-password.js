import {
  createPasswordResetToken,
  getAdminEmail,
} from '../_lib/adminSession.js'
import { methodNotAllowed, readJson, sendJson } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
    const body = await readJson(req)
    const email = body.email?.trim()

    if (!email || email !== getAdminEmail()) {
      return sendJson(res, 200, {
        success: false,
        message: 'Email not found.',
      })
    }

    const resetToken = createPasswordResetToken(email)

    return sendJson(res, 200, {
      success: true,
      resetToken,
      message:
        'Use this temporary reset token to verify ownership, then update ADMIN_PASSWORD in backend env.',
    })
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      message: error.message || 'Unable to process forgot password request.',
    })
  }
}
