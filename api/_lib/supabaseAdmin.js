import { getBackendConfig, requireConfigValues } from './env.js'

function createSupabaseError(payload, status) {
  const message =
    payload?.message || payload?.error || payload?.details || 'Supabase request failed.'
  const error = new Error(message)
  error.code = payload?.code || null
  error.status = status
  error.details = payload?.details || null
  return error
}

export async function supabaseAdminRequest(path, options = {}) {
  const config = getBackendConfig()

  requireConfigValues({
    SUPABASE_URL: config.supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
  })

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw createSupabaseError(payload, response.status)
  }

  return payload
}

export async function fetchArtworkById(productId) {
  const response = await supabaseAdminRequest(
    `artworks?select=id,title,price,status,medium,size,images,image&id=eq.${Number(productId)}&limit=1`,
  )

  return response?.[0] || null
}

export async function fetchOrderByPaymentId(razorpayPaymentId) {
  const encodedPaymentId = encodeURIComponent(razorpayPaymentId)
  const response = await supabaseAdminRequest(
    `orders?select=*&razorpay_payment_id=eq.${encodedPaymentId}&limit=1`,
  )

  return response?.[0] || null
}

export async function fetchLatestOrderCodes(limit = 20) {
  return supabaseAdminRequest(
    `orders?select=order_code&order=id.desc&limit=${Number(limit)}`,
  )
}
