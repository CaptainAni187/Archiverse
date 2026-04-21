import { methodNotAllowed, sendJson } from '../../_lib/http.js'
import { fetchOrderByCode } from '../../_lib/supabaseAdmin.js'

function normalizeTrackingOrder(order) {
  return {
    order_code: order.order_code,
    product_title: order.product_title,
    payment_status: order.payment_status || 'pending',
    total_amount: Number(order.total_amount),
    advance_amount: Number(order.advance_amount),
    created_at: order.created_at || null,
    payment_verified_at: order.payment_verified_at || null,
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
    const orderCode = String(req.query.orderCode || '').trim()

    if (!orderCode) {
      return sendJson(res, 400, {
        success: false,
        message: 'A valid order code is required.',
      })
    }

    const order = await fetchOrderByCode(orderCode)

    if (!order) {
      return sendJson(res, 404, {
        success: false,
        message: 'No order found for this order code.',
      })
    }

    return sendJson(res, 200, {
      success: true,
      order: normalizeTrackingOrder(order),
    })
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to fetch order tracking details.',
    })
  }
}
