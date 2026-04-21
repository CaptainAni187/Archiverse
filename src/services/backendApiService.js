import { getAdminToken } from './adminAuthService'

async function parseApiResponse(response) {
  const text = await response.text()
  let payload = {}

  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    throw new Error('Server returned an invalid response.')
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed (${response.status}).`)
  }

  return payload
}

export async function backendRequest(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  })

  return parseApiResponse(response)
}

export async function backendAdminRequest(path, options = {}) {
  const token = getAdminToken()

  return backendRequest(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token || ''}`,
      ...(options.headers || {}),
    },
  })
}

export async function createPaymentOrder(productId) {
  const payload = await backendRequest('/api/create-order', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  })

  return payload.order
}

export async function verifyPayment(paymentDetails) {
  return backendRequest('/api/verify-payment', {
    method: 'POST',
    body: JSON.stringify(paymentDetails),
  })
}

export async function lookupOrderByPaymentId(paymentId) {
  const payload = await backendRequest(
    `/api/orders?payment_id=${encodeURIComponent(paymentId)}`,
  )

  return payload.order
}

export async function lookupOrderByCode(orderCode) {
  const payload = await backendRequest(
    `/api/orders/code/${encodeURIComponent(orderCode)}`,
  )

  return payload.order
}

export async function createVerifiedOrder(orderInput) {
  const payload = await backendRequest('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderInput),
  })

  return payload.order
}

export async function uploadArtworkImages(files) {
  const formData = new FormData()

  files.forEach((file) => {
    formData.append('images', file)
  })

  const payload = await backendAdminRequest('/api/upload-images', {
    method: 'POST',
    body: formData,
  })

  return payload.images
}
