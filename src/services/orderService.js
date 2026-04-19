import { supabaseRequest } from './supabaseClient'
import { createVerifiedOrder, lookupOrderByPaymentId } from './backendApiService'
import { ORDER_STATUSES } from '../constants/orderStatus'

function normalizeOrder(order) {
  return {
    ...order,
    order_code: order.order_code || null,
    total_amount: Number(order.total_amount),
    advance_amount: Number(order.advance_amount),
    payment_verified_at: order.payment_verified_at || null,
    razorpay_payment_id: order.razorpay_payment_id || null,
    razorpay_order_id: order.razorpay_order_id || null,
    payment_status: ORDER_STATUSES.includes(order.payment_status)
      ? order.payment_status
      : 'pending',
  }
}

export async function createOrder(orderInput) {
  if (!orderInput.customer_name?.trim()) {
    throw new Error('Customer name is required.')
  }

  if (!orderInput.customer_phone?.trim()) {
    throw new Error('Customer phone is required.')
  }

  if (!orderInput.customer_address?.trim()) {
    throw new Error('Customer address is required.')
  }

  if (!orderInput.customer_email?.trim()) {
    throw new Error('Customer email is required.')
  }

  if (!Number.isFinite(Number(orderInput.total_amount))) {
    throw new Error('Order total amount is invalid.')
  }

  if (!Number.isFinite(Number(orderInput.advance_amount))) {
    throw new Error('Order advance amount is invalid.')
  }

  const payload = {
    ...orderInput,
    payment_status: ORDER_STATUSES.includes(orderInput.payment_status)
      ? orderInput.payment_status
      : 'pending',
  }

  const data = await createVerifiedOrder(payload)
  return normalizeOrder(data)
}

export async function fetchOrders() {
  const data = await supabaseRequest('orders?select=*&order=id.desc')
  return data.map(normalizeOrder)
}

export async function findOrderByPaymentId(paymentId) {
  const order = await lookupOrderByPaymentId(paymentId)
  return normalizeOrder(order)
}

export async function updateOrderPaymentStatus(orderId, paymentStatus) {
  const normalizedStatus = ORDER_STATUSES.includes(paymentStatus)
    ? paymentStatus
    : 'pending'

  const data = await supabaseRequest(`orders?id=eq.${Number(orderId)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ payment_status: normalizedStatus }),
  })

  return normalizeOrder(data[0])
}
