import { getBackendConfig, requireConfigValues } from './_lib/env.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { createPaymentLog } from './_lib/paymentLogs.js'
import { fetchRazorpayPayment, verifyRazorpaySignature } from './_lib/razorpay.js'
import { fetchOrderByPaymentId } from './_lib/supabaseAdmin.js'
import {
  paymentVerificationSchema,
  sendValidationError,
  validateWithSchema,
} from './_lib/validation.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
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
      message: verified
        ? 'Payment verified successfully.'
        : `Payment is not in a verified state. Current status: ${paymentStatus}.`,
    })
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      verified: false,
      message: error.message || 'Unable to verify payment.',
    })
  }
}
