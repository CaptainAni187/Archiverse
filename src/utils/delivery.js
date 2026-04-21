const DELIVERY_RULES = {
  canvas: {
    shippingCost: 1200,
    deliveryEstimate: '5-7 business days',
  },
  sketch: {
    shippingCost: 350,
    deliveryEstimate: '3-5 business days',
  },
}

function getNormalizedCategory(artwork) {
  const category = String(artwork?.category || '')
    .trim()
    .toLowerCase()

  return category === 'sketch' ? 'sketch' : 'canvas'
}

export function getDeliveryDetails(artwork) {
  const subtotal = Number(artwork?.price || 0)
  const category = getNormalizedCategory(artwork)
  const rule = DELIVERY_RULES[category]
  const shippingCost = rule.shippingCost
  const totalAmount = subtotal + shippingCost
  const advanceAmount = Number((totalAmount / 2).toFixed(2))

  return {
    category,
    subtotal,
    shippingCost,
    deliveryEstimate: rule.deliveryEstimate,
    totalAmount,
    advanceAmount,
    remainingAmount: Number((totalAmount - advanceAmount).toFixed(2)),
  }
}
