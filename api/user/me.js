import { methodNotAllowed, sendJson } from '../_lib/http.js'
import { requireUserAuth } from '../_lib/userSession.js'

export default async function handler(req, res) {
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
