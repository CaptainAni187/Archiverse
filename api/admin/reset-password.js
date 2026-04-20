import {
  consumePasswordResetToken,
  getAdminEmail,
  updateAdminPassword,
} from '../_lib/adminSession.js'
import { methodNotAllowed, readJson, sendJson } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
    const body = await readJson(req)
    const email = body.email?.trim()
    const token = body.token?.trim()
    const newPassword = body.new_password || ''

    if (!email || !token || !newPassword) {
      return sendJson(res, 400, {
        success: false,
        message: 'Email, token, and new_password are required.',
      })
    }

    if (email !== getAdminEmail()) {
      return sendJson(res, 401, {
        success: false,
        message: 'Invalid reset request.',
      })
    }

    if (newPassword.length < 8) {
      return sendJson(res, 400, {
        success: false,
        message: 'New password must be at least 8 characters.',
      })
    }

    const tokenValid = consumePasswordResetToken(token, email)
    if (!tokenValid) {
      return sendJson(res, 401, {
        success: false,
        message: 'Reset token is invalid or expired.',
      })
    }

    updateAdminPassword(newPassword)

    return sendJson(res, 200, {
      success: true,
      message:
        'Password reset successful for current runtime. Persist in backend env for long-term usage.',
    })
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      message: error.message || 'Unable to reset password.',
    })
  }
}
