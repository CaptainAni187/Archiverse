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
    `artworks?select=*&id=eq.${Number(productId)}&limit=1`,
  )

  return response?.[0] || null
}

export async function fetchArtworks() {
  return supabaseAdminRequest('artworks?select=*&order=id.asc')
}

export async function createArtwork(payload) {
  const response = await supabaseAdminRequest('artworks', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  return response?.[0] || null
}

export async function updateArtwork(id, payload) {
  const response = await supabaseAdminRequest(`artworks?id=eq.${Number(id)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  return response?.[0] || null
}

export async function decrementArtworkStock(artwork) {
  const currentQuantity = Number.isFinite(Number(artwork.quantity))
    ? Number(artwork.quantity)
    : 1
  const nextQuantity = Math.max(0, currentQuantity - 1)

  return updateArtwork(artwork.id, {
    quantity: nextQuantity,
    status: nextQuantity <= 0 ? 'sold' : artwork.status || 'available',
  })
}

export async function deleteArtwork(id) {
  await supabaseAdminRequest(`artworks?id=eq.${Number(id)}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=minimal',
    },
  })

  return { id: Number(id) }
}

export async function fetchOrderByPaymentId(razorpayPaymentId) {
  const encodedPaymentId = encodeURIComponent(razorpayPaymentId)
  const response = await supabaseAdminRequest(
    `orders?select=*&razorpay_payment_id=eq.${encodedPaymentId}&limit=1`,
  )

  return response?.[0] || null
}

export async function fetchOrderById(orderId) {
  const response = await supabaseAdminRequest(
    `orders?select=*&id=eq.${Number(orderId)}&limit=1`,
  )

  return response?.[0] || null
}

export async function fetchOrderByCode(orderCode) {
  const encodedOrderCode = encodeURIComponent(orderCode)
  const response = await supabaseAdminRequest(
    `orders?select=*&order_code=eq.${encodedOrderCode}&limit=1`,
  )

  return response?.[0] || null
}

export async function fetchLatestOrderCodes(limit = 20) {
  return supabaseAdminRequest(
    `orders?select=order_code&order=id.desc&limit=${Number(limit)}`,
  )
}

export async function fetchOrders() {
  return supabaseAdminRequest('orders?select=*&order=id.desc')
}

export async function fetchOrdersByCustomerEmail(email) {
  const encodedEmail = encodeURIComponent(String(email || '').trim().toLowerCase())
  return supabaseAdminRequest(
    `orders?select=*&customer_email=eq.${encodedEmail}&order=id.desc`,
  )
}

export async function fetchOrderAnalyticsRows() {
  return supabaseAdminRequest(
    'orders?select=id,product_id,total_amount,advance_amount,payment_status,created_at&order=created_at.desc',
  )
}

export async function updateOrderById(id, payload) {
  const response = await supabaseAdminRequest(`orders?id=eq.${Number(id)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  return response?.[0] || null
}

export async function fetchCommissions() {
  return supabaseAdminRequest('commissions?select=*&order=id.desc')
}

export async function fetchCommissionById(id) {
  const response = await supabaseAdminRequest(
    `commissions?select=*&id=eq.${Number(id)}&limit=1`,
  )

  return response?.[0] || null
}

export async function createCommission(payload) {
  const response = await supabaseAdminRequest('commissions', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  return response?.[0] || null
}

export async function updateCommissionById(id, payload) {
  const response = await supabaseAdminRequest(`commissions?id=eq.${Number(id)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  return response?.[0] || null
}

export async function fetchUserByEmail(email) {
  const encodedEmail = encodeURIComponent(String(email || '').trim().toLowerCase())
  const response = await supabaseAdminRequest(
    `user_accounts?select=*&email=eq.${encodedEmail}&limit=1`,
  )

  return response?.[0] || null
}

export async function createUserAccount(payload) {
  const response = await supabaseAdminRequest('user_accounts', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  return response?.[0] || null
}

export async function fetchVisibleTestimonials() {
  return supabaseAdminRequest(
    'testimonials?select=*&is_visible=eq.true&order=created_at.desc&limit=6',
  )
}

export async function createTestimonial(payload) {
  const response = await supabaseAdminRequest('testimonials', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  return response?.[0] || null
}
