import { requireAdminAuth } from './_lib/adminSession.js'
import { getBackendConfig } from './_lib/env.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { notifyAdmin, notifyCustomer } from './_lib/notifications.js'
import {
  getOrderStatusTimestampPatch,
  getOrderStatusTransitionError,
} from './_lib/orderLifecycle.js'
import { createPaymentLog } from './_lib/paymentLogs.js'
import { fetchRazorpayPayment, verifyRazorpaySignature } from './_lib/razorpay.js'
import {
  decrementArtworkStock,
  fetchArtworkById,
  fetchLatestOrderCodes,
  fetchOrderByCode,
  fetchOrderById,
  fetchOrderByPaymentId,
  fetchOrders,
  supabaseAdminRequest,
  updateOrderById,
} from './_lib/supabaseAdmin.js'
import {
  orderCreationSchema,
  orderUpdateSchema,
  paymentVerificationSchema,
  sendValidationError,
  validateWithSchema,
} from './_lib/validation.js'
import { getDeliveryDetails } from '../src/utils/delivery.js'

function normalizeOrder(order) {
  return {
    ...order,
    total_amount: Number(order.total_amount),
    advance_amount: Number(order.advance_amount),
    processing_at: order.processing_at || null,
    shipped_at: order.shipped_at || null,
    delivered_at: order.delivered_at || null,
    payment_verified_at: order.payment_verified_at || null,
    razorpay_payment_id: order.razorpay_payment_id || null,
    razorpay_order_id: order.razorpay_order_id || null,
  }
}

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
    customer_name: order.customer_name || null,
    customer_email: order.customer_email || null,
    customer_phone: order.customer_phone || null,
    customer_address: order.customer_address || null,
    razorpay_payment_id: order.razorpay_payment_id || null,
  }
}

function getOrderId(req) {
  const orderId = req.query?.id
  return Array.isArray(orderId) ? Number(orderId[0]) : Number(orderId)
}

function getAction(req) {
  return String(req.query?.action || '').trim().toLowerCase()
}

function getNextOrderCode(existingCodes) {
  const currentYear = new Date().getFullYear()
  const orderNumbers = existingCodes
    .map((item) => item.order_code)
    .filter((code) => typeof code === 'string' && code.startsWith(`ARC-${currentYear}-`))
    .map((code) => Number(code.split('-').pop()))
    .filter((value) => Number.isInteger(value))

  const nextNumber = (Math.max(0, ...orderNumbers) || 0) + 1
  return `ARC-${currentYear}-${String(nextNumber).padStart(4, '0')}`
}

async function createOrderRecord(payload) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latestCodes = await fetchLatestOrderCodes()
    const orderCode = getNextOrderCode(latestCodes)

    try {
      const response = await supabaseAdminRequest('orders', {
        method: 'POST',
        headers: {
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          ...payload,
          order_code: orderCode,
        }),
      })

      return response[0]
    } catch (error) {
      if (error.code === '23505' && error.message.includes('razorpay_payment_id')) {
        const existingOrder = await fetchOrderByPaymentId(payload.razorpay_payment_id)
        if (existingOrder) {
          return existingOrder
        }
      }

      if (error.code === '23505' && error.message.includes('order_code')) {
        continue
      }

      throw error
    }
  }

  throw new Error('Unable to allocate a unique order code. Please retry.')
}

async function handleCreateOrder(req, res) {
  const body = await readJson(req)
  const validatedBody = validateWithSchema(orderCreationSchema, body)
  validateWithSchema(paymentVerificationSchema, validatedBody)
  const productId = validatedBody.product_id
  const customerName = validatedBody.customer_name
  const customerPhone = validatedBody.customer_phone
  const customerAddress = validatedBody.customer_address
  const customerEmail = validatedBody.customer_email
  const razorpayPaymentId = validatedBody.razorpay_payment_id
  const razorpayOrderId = validatedBody.razorpay_order_id
  const razorpaySignature = validatedBody.razorpay_signature

  const existingOrder = await fetchOrderByPaymentId(razorpayPaymentId)
  if (existingOrder) {
    const normalizedOrder = normalizeOrder(existingOrder)
    await createPaymentLog({
      event_type: 'create_order',
      status: 'duplicate_payment_id',
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      order_id: existingOrder.id,
      details: {
        message: 'Duplicate payment ID reused during order creation.',
      },
    })

    return sendJson(res, 200, {
      success: true,
      duplicated: true,
      order: normalizedOrder,
      data: {
        duplicated: true,
        order: normalizedOrder,
      },
    })
  }

  const artwork = await fetchArtworkById(productId)
  if (!artwork) {
    return sendJson(res, 404, {
      success: false,
      error: 'ARTWORK_NOT_FOUND',
      message: 'Selected artwork was not found.',
    })
  }

  if (artwork.status === 'sold' || Number(artwork.quantity) <= 0) {
    return sendJson(res, 409, {
      success: false,
      error: 'ARTWORK_SOLD',
      message: 'This artwork has already been sold.',
    })
  }

  const config = getBackendConfig()
  if (!config.razorpayKeyId || !config.razorpayKeySecret) {
    throw new Error('Razorpay backend environment variables are not configured.')
  }

  const signatureValid = verifyRazorpaySignature({
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature,
    razorpayKeySecret: config.razorpayKeySecret,
  })

  if (!signatureValid) {
    await createPaymentLog({
      event_type: 'create_order',
      status: 'invalid_signature',
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      details: {
        product_id: productId,
      },
    })

    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_SIGNATURE',
      message: 'Payment signature verification failed during order creation.',
    })
  }

  const payment = await fetchRazorpayPayment({
    razorpayPaymentId,
    razorpayKeyId: config.razorpayKeyId,
    razorpayKeySecret: config.razorpayKeySecret,
  })

  if (!['authorized', 'captured'].includes(payment.status)) {
    await createPaymentLog({
      event_type: 'create_order',
      status: 'unverified_payment_state',
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      details: {
        payment_status: payment.status || 'unknown',
      },
    })

    return sendJson(res, 400, {
      success: false,
      error: 'PAYMENT_NOT_VERIFIED',
      message: `Payment is not in a verified state. Current status: ${payment.status}.`,
    })
  }

  const deliveryDetails = getDeliveryDetails(artwork)
  const totalAmount = deliveryDetails.totalAmount
  const advanceAmount = deliveryDetails.advanceAmount
  const expectedAmountInPaise = Math.round(advanceAmount * 100)

  if (Number(payment.amount) !== expectedAmountInPaise || payment.order_id !== razorpayOrderId) {
    await createPaymentLog({
      event_type: 'create_order',
      status: 'payment_mismatch',
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      details: {
        expected_amount: expectedAmountInPaise,
        received_amount: Number(payment.amount),
        payment_order_id: payment.order_id || null,
        expected_order_id: razorpayOrderId,
      },
    })

    return sendJson(res, 400, {
      success: false,
      error: 'PAYMENT_MISMATCH',
      message: 'Payment details do not match the selected artwork.',
    })
  }

  const createdOrder = await createOrderRecord({
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    customer_email: customerEmail,
    product_id: artwork.id,
    product_title: artwork.title,
    total_amount: totalAmount,
    advance_amount: advanceAmount,
    payment_status: 'advance_paid',
    razorpay_payment_id: razorpayPaymentId,
    razorpay_order_id: razorpayOrderId,
    razorpay_signature: razorpaySignature,
    payment_provider: 'razorpay',
    payment_verified_at: new Date().toISOString(),
  })

  const order = normalizeOrder(createdOrder)
  await decrementArtworkStock(artwork)

  await createPaymentLog({
    event_type: 'create_order',
    status: 'order_created',
    razorpay_payment_id: razorpayPaymentId,
    razorpay_order_id: razorpayOrderId,
    order_id: order.id,
    details: {
      product_id: artwork.id,
      product_title: artwork.title,
    },
  })

  const [adminNotification, customerNotification] = await Promise.allSettled([
    notifyAdmin(order, config),
    notifyCustomer(order, config),
  ])

  return sendJson(res, 201, {
    success: true,
    duplicated: false,
    order,
    notifications: {
      admin:
        adminNotification.status === 'fulfilled'
          ? adminNotification.value
          : { emailStatus: { delivered: false, skipped: false } },
      customer:
        customerNotification.status === 'fulfilled'
          ? customerNotification.value
          : { delivered: false, skipped: false },
    },
    data: {
      duplicated: false,
      order,
      notifications: {
        admin:
          adminNotification.status === 'fulfilled'
            ? adminNotification.value
            : { emailStatus: { delivered: false, skipped: false } },
        customer:
          customerNotification.status === 'fulfilled'
            ? customerNotification.value
            : { delivered: false, skipped: false },
      },
    },
  })
}

async function handleLookupOrders(req, res) {
  const paymentId = String(req.query?.payment_id || '').trim()

  if (!paymentId) {
    if (!requireAdminAuth(req, res)) {
      return null
    }

    const orders = await fetchOrders()
    return sendJson(res, 200, {
      success: true,
      orders: orders.map(normalizeOrder),
      data: orders.map(normalizeOrder),
    })
  }

  const order = await fetchOrderByPaymentId(paymentId)

  if (!order) {
    return sendJson(res, 404, {
      success: false,
      error: 'ORDER_NOT_FOUND',
      message: 'No order found for this payment yet.',
    })
  }

  return sendJson(res, 200, {
    success: true,
    order: normalizeOrder(order),
    data: normalizeOrder(order),
  })
}

async function handleLookupOrderByCode(req, res) {
  const orderCode = String(req.query?.orderCode || '').trim()

  if (!orderCode) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_ORDER_CODE',
      message: 'A valid order code is required.',
    })
  }

  const order = await fetchOrderByCode(orderCode)

  if (!order) {
    return sendJson(res, 404, {
      success: false,
      error: 'ORDER_NOT_FOUND',
      message: 'No order found for this order code.',
    })
  }

  return sendJson(res, 200, {
    success: true,
    order: normalizeTrackingOrder(order),
    data: normalizeTrackingOrder(order),
  })
}

async function handleUpdateOrderStatus(req, res) {
  if (!requireAdminAuth(req, res)) {
    return null
  }

  const orderId = getOrderId(req)
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_ORDER_ID',
      message: 'A valid order id is required.',
    })
  }

  const body = await readJson(req)
  const payload = validateWithSchema(orderUpdateSchema, body)
  const existingOrder = await fetchOrderById(orderId)

  if (!existingOrder) {
    return sendJson(res, 404, {
      success: false,
      error: 'ORDER_NOT_FOUND',
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
      error: 'INVALID_STATUS_TRANSITION',
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
    data: normalizeOrder(updatedOrder),
  })
}

export default async function handler(req, res) {
  try {
    const action = getAction(req)

    if (req.method === 'POST') {
      return await handleCreateOrder(req, res)
    }

    if (req.method === 'GET' && action === 'code') {
      return await handleLookupOrderByCode(req, res)
    }

    if (req.method === 'GET') {
      return await handleLookupOrders(req, res)
    }

    if ((req.method === 'PATCH' || req.method === 'PUT') && action === 'status') {
      return await handleUpdateOrderStatus(req, res)
    }

    return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'PUT'])
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      error: error.error || 'ORDER_REQUEST_FAILED',
      message: error.message || 'Unable to process the order request.',
    })
  }
}
