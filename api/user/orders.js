import { methodNotAllowed, sendJson } from '../_lib/http.js'
import { fetchOrdersByCustomerEmail } from '../_lib/supabaseAdmin.js'
import { requireUserAuth } from '../_lib/userSession.js'

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  try {
    const session = requireUserAuth(req, res)
    if (!session) {
      return null
    }

    const orders = await fetchOrdersByCustomerEmail(session.email)

    return sendJson(res, 200, {
      success: true,
      orders: orders.map(normalizeOrder),
    })
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to load user orders.',
    })
  }
}
