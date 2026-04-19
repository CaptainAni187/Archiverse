import { getBackendConfig, requireConfigValues } from './_lib/env.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { createRazorpayOrder } from './_lib/razorpay.js'
import { fetchArtworkById } from './_lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
    const body = await readJson(req)
    const productId = Number(body.product_id)

    if (!Number.isInteger(productId) || productId <= 0) {
      return sendJson(res, 400, {
        success: false,
        message: 'A valid product_id is required.',
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
        message: 'This artwork is no longer available.',
      })
    }

    const totalAmount = Number(artwork.price)
    const advanceAmount = Number((totalAmount / 2).toFixed(2))
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
        totalAmount,
        advanceAmount,
      },
    })
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to initialize payment.',
    })
  }
}
