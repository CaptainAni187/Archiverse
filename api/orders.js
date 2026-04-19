import { getBackendConfig } from './_lib/env.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { notifyAdmin, notifyCustomer } from './_lib/notifications.js'
import { fetchRazorpayPayment, verifyRazorpaySignature } from './_lib/razorpay.js'
import {
  fetchArtworkById,
  fetchLatestOrderCodes,
  fetchOrderByPaymentId,
  supabaseAdminRequest,
} from './_lib/supabaseAdmin.js'

function normalizeOrder(order) {
  return {
    ...order,
    total_amount: Number(order.total_amount),
    advance_amount: Number(order.advance_amount),
  }
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
  const productId = Number(body.product_id)
  const customerName = body.customer_name?.trim()
  const customerPhone = body.customer_phone?.trim()
  const customerAddress = body.customer_address?.trim()
  const customerEmail = body.customer_email?.trim()
  const razorpayPaymentId = body.razorpay_payment_id?.trim()
  const razorpayOrderId = body.razorpay_order_id?.trim()
  const razorpaySignature = body.razorpay_signature?.trim()

  if (!customerName || !customerPhone || !customerAddress || !customerEmail) {
    return sendJson(res, 400, {
      success: false,
      message: 'Customer name, phone, address, and email are required.',
    })
  }

  if (!Number.isInteger(productId) || productId <= 0) {
    return sendJson(res, 400, {
      success: false,
      message: 'A valid product_id is required.',
    })
  }

  if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    return sendJson(res, 400, {
      success: false,
      message: 'Verified payment credentials are required to create an order.',
    })
  }

  const existingOrder = await fetchOrderByPaymentId(razorpayPaymentId)
  if (existingOrder) {
    return sendJson(res, 200, {
      success: true,
      duplicated: true,
      order: normalizeOrder(existingOrder),
    })
  }

  const artwork = await fetchArtworkById(productId)
  if (!artwork) {
    return sendJson(res, 404, {
      success: false,
      message: 'Selected artwork was not found.',
    })
  }

  if (artwork.status === 'sold') {
    return sendJson(res, 409, {
      success: false,
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
    return sendJson(res, 400, {
      success: false,
      message: 'Payment signature verification failed during order creation.',
    })
  }

  const payment = await fetchRazorpayPayment({
    razorpayPaymentId,
    razorpayKeyId: config.razorpayKeyId,
    razorpayKeySecret: config.razorpayKeySecret,
  })

  if (!['authorized', 'captured'].includes(payment.status)) {
    return sendJson(res, 400, {
      success: false,
      message: `Payment is not in a verified state. Current status: ${payment.status}.`,
    })
  }

  const totalAmount = Number(artwork.price)
  const advanceAmount = Number((totalAmount / 2).toFixed(2))
  const expectedAmountInPaise = Math.round(advanceAmount * 100)

  if (Number(payment.amount) !== expectedAmountInPaise || payment.order_id !== razorpayOrderId) {
    return sendJson(res, 400, {
      success: false,
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

  await Promise.allSettled([
    notifyAdmin(order, config),
    notifyCustomer(order, config),
  ])

  return sendJson(res, 201, {
    success: true,
    duplicated: false,
    order,
  })
}

async function handleLookupOrder(req, res) {
  const paymentId = String(req.query.payment_id || '').trim()

  if (!paymentId) {
    return sendJson(res, 400, {
      success: false,
      message: 'payment_id query parameter is required.',
    })
  }

  const order = await fetchOrderByPaymentId(paymentId)

  if (!order) {
    return sendJson(res, 404, {
      success: false,
      message: 'No order found for this payment yet.',
    })
  }

  return sendJson(res, 200, {
    success: true,
    order: normalizeOrder(order),
  })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      return await handleCreateOrder(req, res)
    }

    if (req.method === 'GET') {
      return await handleLookupOrder(req, res)
    }

    return methodNotAllowed(res, ['GET', 'POST'])
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to process the order request.',
    })
  }
}
