import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockResponse } from './helpers/http.js'

describe('admin login handler', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.ADMIN_EMAIL = 'admin@example.com'
    process.env.ADMIN_PASSWORD = 'SuperSecret123!'
    process.env.ADMIN_SESSION_SECRET = 'session-secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a JWT for valid credentials', async () => {
    const { default: handler } = await import('../api/admin/login.js')
    const res = createMockResponse()

    await handler(
      {
        method: 'POST',
        body: {
          email: 'admin@example.com',
          password: 'SuperSecret123!',
        },
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      },
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.length).toBeGreaterThan(20)
  })

  it('rejects invalid credentials', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { default: handler } = await import('../api/admin/login.js')
    const res = createMockResponse()

    await handler(
      {
        method: 'POST',
        body: {
          email: 'admin@example.com',
          password: 'wrong-password',
        },
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      },
      res,
    )

    expect(res.statusCode).toBe(401)
    expect(res.body.message).toBe('Invalid admin credentials.')
    expect(warnSpy).toHaveBeenCalled()
  })
})
