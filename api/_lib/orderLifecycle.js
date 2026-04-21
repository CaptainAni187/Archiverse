export const ORDER_STATUSES = [
  'pending',
  'advance_paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

const ALLOWED_TRANSITIONS = {
  pending: ['advance_paid', 'cancelled'],
  advance_paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export function normalizeOrderStatus(value) {
  return ORDER_STATUSES.includes(value) ? value : 'pending'
}

export function canTransitionOrderStatus(currentStatus, nextStatus) {
  const from = normalizeOrderStatus(currentStatus)
  const to = normalizeOrderStatus(nextStatus)

  if (from === to) {
    return true
  }

  return ALLOWED_TRANSITIONS[from]?.includes(to) === true
}

export function getOrderStatusTransitionError(currentStatus, nextStatus) {
  const from = normalizeOrderStatus(currentStatus)
  const to = normalizeOrderStatus(nextStatus)

  if (from === to) {
    return null
  }

  const allowedTargets = ALLOWED_TRANSITIONS[from] || []
  if (allowedTargets.includes(to)) {
    return null
  }

  return `Invalid order status transition from ${from} to ${to}.`
}

export function getOrderStatusTimestampPatch(currentStatus, nextStatus, now = new Date()) {
  const from = normalizeOrderStatus(currentStatus)
  const to = normalizeOrderStatus(nextStatus)
  const timestamp = now.toISOString()
  const patch = {
    payment_status: to,
  }

  if (from !== to && to === 'processing') {
    patch.processing_at = timestamp
  }

  if (from !== to && to === 'shipped') {
    patch.shipped_at = timestamp
  }

  if (from !== to && to === 'delivered') {
    patch.delivered_at = timestamp
  }

  return patch
}
