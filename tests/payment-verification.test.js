import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyResponse, createJsonResponse, createMockResponse } from './helpers/http.js'

describe('payment verification handler', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.SUPABASE_URL = 'https://supabase.example.com'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects reused payment ids', async () => {
    global.fetch = vi.fn(async (url) => {
      const value = String(url)

      if (value.includes('/rest/v1/orders?select=*&razorpay_payment_id=eq.pay_duplicate')) {
        return createJsonResponse([{ id: 99, razorpay_payment_id: 'pay_duplicate' }])
      }

      if (value.includes('/rest/v1/payment_logs')) {
        return createEmptyResponse(201)
      }

      throw new Error(`Unexpected fetch: ${value}`)
    })

    const { default: handler } = await import('../api/payments.js')
    const res = createMockResponse()

    await handler(
      {
        method: 'POST',
        query: { action: 'verify' },
        body: {
          razorpay_payment_id: 'pay_duplicate',
          razorpay_order_id: 'order_1',
          razorpay_signature: 'sig_1',
        },
      },
      res,
    )

    expect(res.statusCode).toBe(409)
    expect(res.body.verified).toBe(false)
    expect(res.body.message).toBe('This payment has already been used.')
  })

  it('rejects invalid signatures', async () => {
    global.fetch = vi.fn(async (url) => {
      const value = String(url)

      if (value.includes('/rest/v1/orders?select=*&razorpay_payment_id=eq.pay_new')) {
        return createJsonResponse([])
      }

      if (value.includes('/rest/v1/payment_logs')) {
        return createEmptyResponse(201)
      }

      throw new Error(`Unexpected fetch: ${value}`)
    })

    const { default: handler } = await import('../api/payments.js')
    const res = createMockResponse()

    await handler(
      {
        method: 'POST',
        query: { action: 'verify' },
        body: {
          razorpay_payment_id: 'pay_new',
          razorpay_order_id: 'order_new',
          razorpay_signature: crypto.createHash('sha256').update('wrong').digest('hex'),
        },
      },
      res,
    )

    expect(res.statusCode).toBe(400)
    expect(res.body.verified).toBe(false)
    expect(res.body.message).toBe('Payment signature verification failed.')
  })
})
