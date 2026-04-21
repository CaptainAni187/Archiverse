import { supabaseAdminRequest } from './supabaseAdmin.js'

export async function createPaymentLog({
  event_type,
  status,
  razorpay_payment_id = null,
  razorpay_order_id = null,
  order_id = null,
  details = {},
}) {
  try {
    await supabaseAdminRequest('payment_logs', {
      method: 'POST',
      headers: {
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type,
        status,
        razorpay_payment_id,
        razorpay_order_id,
        order_id,
        details,
      }),
    })
  } catch (error) {
    console.error('[payment-log] Failed to persist payment log:', error.message)
  }
}
