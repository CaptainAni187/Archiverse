import { requireAdminAuth } from '../_lib/adminSession.js'
import { methodNotAllowed, sendJson } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const session = requireAdminAuth(req, res)
  if (!session) {
    return null
  }

  return sendJson(res, 200, {
    success: true,
    authenticated: true,
    admin: {
      email: session.email,
      role: session.role,
    },
    expires_at: typeof session.exp === 'number' ? new Date(session.exp * 1000).toISOString() : null,
  })
}
