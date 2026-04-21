import { requireAdminAuth } from '../../_lib/adminSession.js'
import { methodNotAllowed, readJson, sendJson } from '../../_lib/http.js'
import {
  getOrderStatusTimestampPatch,
  getOrderStatusTransitionError,
} from '../../_lib/orderLifecycle.js'
import { fetchOrderById, updateOrderById } from '../../_lib/supabaseAdmin.js'
import {
  orderUpdateSchema,
  sendValidationError,
  validateWithSchema,
} from '../../_lib/validation.js'

function normalizeOrder(order) {
  return {
    ...order,
    total_amount: Number(order.total_amount),
    advance_amount: Number(order.advance_amount),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return methodNotAllowed(res, ['PATCH'])
  }

  try {
    if (!requireAdminAuth(req, res)) {
      return null
    }

    const orderId = Number(req.query.id)
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return sendJson(res, 400, {
        success: false,
        message: 'A valid order id is required.',
      })
    }

    const body = await readJson(req)
    const payload = validateWithSchema(orderUpdateSchema, body)
    const existingOrder = await fetchOrderById(orderId)

    if (!existingOrder) {
      return sendJson(res, 404, {
        success: false,
        message: 'Order not found.',
      })
    }

    const transitionError = getOrderStatusTransitionError(
      existingOrder.payment_status,
      payload.payment_status,
    )

    if (transitionError) {
      return sendJson(res, 409, {
        success: false,
        message: transitionError,
      })
    }

    const updatedOrder = await updateOrderById(
      orderId,
      getOrderStatusTimestampPatch(existingOrder.payment_status, payload.payment_status),
    )

    return sendJson(res, 200, {
      success: true,
      order: normalizeOrder(updatedOrder),
    })
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to update order status.',
    })
  }
}
