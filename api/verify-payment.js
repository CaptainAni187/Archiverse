import { getBackendConfig, requireConfigValues } from './_lib/env.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { fetchRazorpayPayment, verifyRazorpaySignature } from './_lib/razorpay.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
    const body = await readJson(req)
    const razorpayPaymentId = body.razorpay_payment_id?.trim()
    const razorpayOrderId = body.razorpay_order_id?.trim()
    const razorpaySignature = body.razorpay_signature?.trim()

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return sendJson(res, 400, {
        success: false,
        verified: false,
        message: 'Payment verification requires payment, order, and signature values.',
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

    return sendJson(res, verified ? 200 : 400, {
      success: verified,
      verified,
      paymentStatus,
      message: verified
        ? 'Payment verified successfully.'
        : `Payment is not in a verified state. Current status: ${paymentStatus}.`,
    })
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      verified: false,
      message: error.message || 'Unable to verify payment.',
    })
  }
}
