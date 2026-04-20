import { getAdminSessionFromToken } from '../_lib/adminSession.js'
import { methodNotAllowed, sendJson } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''
  const session = getAdminSessionFromToken(bearerToken)

  return sendJson(res, 200, {
    success: true,
    authenticated: Boolean(session?.role === 'admin'),
  })
}
