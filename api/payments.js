import { getBackendConfig, requireConfigValues } from './_lib/env.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { createPaymentLog } from './_lib/paymentLogs.js'
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyRazorpaySignature,
} from './_lib/razorpay.js'
import { fetchArtworkById, fetchOrderByPaymentId } from './_lib/supabaseAdmin.js'
import {
  paymentVerificationSchema,
  sendValidationError,
  validateWithSchema,
} from './_lib/validation.js'
import { getDeliveryDetails } from '../src/utils/delivery.js'

function getAction(req) {
  return String(req.query?.action || '').trim().toLowerCase()
}

async function handleCreatePaymentOrder(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  const body = await readJson(req)
  const productId = Number(body.product_id)

  if (!Number.isInteger(productId) || productId <= 0) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_PRODUCT_ID',
      message: 'A valid product_id is required.',
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
      error: 'ARTWORK_UNAVAILABLE',
      message: 'This artwork is no longer available.',
    })
  }

  const deliveryDetails = getDeliveryDetails(artwork)
  const totalAmount = deliveryDetails.totalAmount
  const advanceAmount = deliveryDetails.advanceAmount
  const amountInPaise = Math.round(advanceAmount * 100)
  const config = getBackendConfig()

  requireConfigValues({
    RAZORPAY_KEY_ID: config.razorpayKeyId,
    RAZORPAY_KEY_SECRET: config.razorpayKeySecret,
  })

  const razorpayOrder = await createRazorpayOrder({
    amountInPaise,
    receipt: `arc-${productId}-${Date.now()}`.slice(0, 40),
    notes: {
      product_id: String(productId),
      product_title: artwork.title,
    },
    razorpayKeyId: config.razorpayKeyId,
    razorpayKeySecret: config.razorpayKeySecret,
  })

  await createPaymentLog({
    event_type: 'payment_order_created',
    status: 'created',
    razorpay_order_id: razorpayOrder.id,
    details: {
      product_id: artwork.id,
      product_title: artwork.title,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    },
  })

  return sendJson(res, 200, {
    success: true,
    order: {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    },
    product: {
      id: artwork.id,
      title: artwork.title,
      shippingCost: deliveryDetails.shippingCost,
      deliveryEstimate: deliveryDetails.deliveryEstimate,
      totalAmount,
      advanceAmount,
    },
    data: {
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      product: {
        id: artwork.id,
        title: artwork.title,
        shippingCost: deliveryDetails.shippingCost,
        deliveryEstimate: deliveryDetails.deliveryEstimate,
        totalAmount,
        advanceAmount,
      },
    },
  })
}

async function handleVerifyPayment(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  const body = await readJson(req)
  const validatedBody = validateWithSchema(paymentVerificationSchema, body)
  const razorpayPaymentId = validatedBody.razorpay_payment_id
  const razorpayOrderId = validatedBody.razorpay_order_id
  const razorpaySignature = validatedBody.razorpay_signature

  const existingOrder = await fetchOrderByPaymentId(razorpayPaymentId)
  if (existingOrder) {
    await createPaymentLog({
      event_type: 'verify_payment',
      status: 'duplicate_payment_id',
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      order_id: existingOrder.id,
      details: {
        message: 'Payment ID has already been used for an order.',
      },
    })

    return sendJson(res, 409, {
      success: false,
      verified: false,
      error: 'PAYMENT_ALREADY_USED',
      message: 'This payment has already been used.',
    })
  }

  const config = getBackendConfig()
  requireConfigValues({
    RAZORPAY_KEY_ID: config.razorpayKeyId,
    RAZORPAY_KEY_SECRET: config.razorpayKeySecret,
  })

  const signatureValid = verifyRazorpaySignature({
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature,
    razorpayKeySecret: config.razorpayKeySecret,
  })

  if (!signatureValid) {
    await createPaymentLog({
      event_type: 'verify_payment',
      status: 'invalid_signature',
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      details: {
        message: 'Payment signature verification failed.',
      },
    })

    return sendJson(res, 400, {
      success: false,
      verified: false,
      error: 'INVALID_SIGNATURE',
      message: 'Payment signature verification failed.',
    })
  }

  const payment = await fetchRazorpayPayment({
    razorpayPaymentId,
    razorpayKeyId: config.razorpayKeyId,
    razorpayKeySecret: config.razorpayKeySecret,
  })

  const paymentStatus = payment.status || 'unknown'
  const verified = ['authorized', 'captured'].includes(paymentStatus)

  await createPaymentLog({
    event_type: 'verify_payment',
    status: verified ? 'verified' : 'unverified_payment_state',
    razorpay_payment_id: razorpayPaymentId,
    razorpay_order_id: razorpayOrderId,
    details: {
      payment_status: paymentStatus,
      amount: payment.amount ?? null,
    },
  })

  return sendJson(res, verified ? 200 : 400, {
    success: verified,
    verified,
    paymentStatus,
    ...(verified
      ? {
          data: {
            verified,
            paymentStatus,
            message: 'Payment verified successfully.',
          },
        }
      : {
          error: 'PAYMENT_NOT_VERIFIED',
          message: `Payment is not in a verified state. Current status: ${paymentStatus}.`,
        }),
  })
}

export default async function handler(req, res) {
  try {
    const action = getAction(req)

    if (action === 'create-order') {
      return await handleCreatePaymentOrder(req, res)
    }

    if (action === 'verify') {
      return await handleVerifyPayment(req, res)
    }

    return sendJson(res, 404, {
      success: false,
      error: 'ROUTE_NOT_FOUND',
      message: 'Payment route not found.',
    })
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      error: error.error || 'PAYMENT_REQUEST_FAILED',
      message: error.message || 'Unable to process payment request.',
    })
  }
}
