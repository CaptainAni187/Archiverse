import { requireAdminAuth } from '../_lib/adminSession.js'
import { methodNotAllowed, sendJson } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  if (!requireAdminAuth(req, res)) {
    return null
  }

  return sendJson(res, 200, { success: true })
}
