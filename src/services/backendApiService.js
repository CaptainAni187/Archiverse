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

async function backendRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  return parseApiResponse(response)
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

export async function createVerifiedOrder(orderInput) {
  const payload = await backendRequest('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderInput),
  })

  return payload.order
}
