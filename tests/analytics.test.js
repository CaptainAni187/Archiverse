import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyResponse, createMockResponse } from './helpers/http.js'

describe('analytics handler', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.SUPABASE_URL = 'https://supabase.example.com'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts supported analytics events and logs them', async () => {
    global.fetch = vi.fn(async (url) => {
      const value = String(url)

      if (value.includes('/rest/v1/analytics_events')) {
        return createEmptyResponse(201)
      }

      throw new Error(`Unexpected fetch: ${value}`)
    })

    const { default: handler } = await import('../api/analytics.js')
    const res = createMockResponse()

    await handler(
      {
        method: 'POST',
        body: {
          event_type: 'artwork_view',
          metadata: { artwork_id: 1 },
        },
      },
      res,
    )

    expect(res.statusCode).toBe(202)
    expect(res.body.success).toBe(true)
  })
})
