import { describe, expect, it } from 'vitest'
import {
  artworkPayloadSchema,
  orderCreationSchema,
  paymentVerificationSchema,
} from '../api/_lib/validation.js'

describe('validation schemas', () => {
  it('normalizes legacy image arrays into structured artwork images', () => {
    const parsed = artworkPayloadSchema.parse({
      title: 'Structured Work',
      price: 1000,
      description: 'Example',
      medium: 'Ink',
      size: 'A4',
      status: 'available',
      category: 'canvas',
      images: ['https://example.com/image.jpg'],
    })

    expect(parsed.images).toEqual([
      {
        url: 'https://example.com/image.jpg',
        is_primary: true,
      },
    ])
  })

  it('rejects artwork payloads with too many images', () => {
    const result = artworkPayloadSchema.safeParse({
      title: 'Bad Work',
      price: 1000,
      description: 'Example',
      medium: 'Ink',
      size: 'A4',
      status: 'available',
      category: 'canvas',
      images: [
        { url: 'https://example.com/1.jpg', is_primary: true },
        { url: 'https://example.com/2.jpg', is_primary: false },
        { url: 'https://example.com/3.jpg', is_primary: false },
        { url: 'https://example.com/4.jpg', is_primary: false },
        { url: 'https://example.com/5.jpg', is_primary: false },
        { url: 'https://example.com/6.jpg', is_primary: false },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('accepts valid order creation payloads', () => {
    const result = orderCreationSchema.safeParse({
      product_id: 1,
      customer_name: 'Ada',
      customer_phone: '+911234567890',
      customer_address: '123 Main Street',
      customer_email: 'ada@example.com',
      razorpay_payment_id: 'pay_123',
      razorpay_order_id: 'order_123',
      razorpay_signature: 'sig_123',
    })

    expect(result.success).toBe(true)
  })

  it('rejects incomplete payment verification payloads', () => {
    const result = paymentVerificationSchema.safeParse({
      razorpay_payment_id: '',
      razorpay_order_id: 'order_123',
      razorpay_signature: '',
    })

    expect(result.success).toBe(false)
  })
})
