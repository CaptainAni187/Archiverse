import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockResponse } from './helpers/http.js'

describe('artworks handler', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('normalizes legacy image fields into images arrays for listing routes', async () => {
    vi.doMock('../api/_lib/supabaseAdmin.js', async () => {
      const actual = await vi.importActual('../api/_lib/supabaseAdmin.js')

      return {
        ...actual,
        fetchArtworks: vi.fn(async () => [
          {
            id: 1,
            title: 'Legacy artwork',
            price: '1200',
            image: 'https://example.com/legacy.jpg',
            images: [],
            quantity: 1,
          },
        ]),
      }
    })

    const { default: handler } = await import('../api/artworks.js')
    const res = createMockResponse()

    await handler(
      {
        method: 'GET',
        query: {},
        headers: {},
      },
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data[0].image).toBe('https://example.com/legacy.jpg')
    expect(res.body.data[0].images).toEqual(['https://example.com/legacy.jpg'])
  })

  it('normalizes legacy image fields into images arrays for single artwork routes', async () => {
    vi.doMock('../api/_lib/supabaseAdmin.js', async () => {
      const actual = await vi.importActual('../api/_lib/supabaseAdmin.js')

      return {
        ...actual,
        fetchArtworkById: vi.fn(async () => ({
          id: 2,
          title: 'Single legacy artwork',
          price: '1800',
          image: 'https://example.com/single.jpg',
          images: null,
          quantity: 1,
        })),
      }
    })

    const { default: handler } = await import('../api/artworks.js')
    const res = createMockResponse()

    await handler(
      {
        method: 'GET',
        query: { id: '2' },
        headers: {},
      },
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(res.body.data.image).toBe('https://example.com/single.jpg')
    expect(res.body.data.images).toEqual(['https://example.com/single.jpg'])
  })
})
