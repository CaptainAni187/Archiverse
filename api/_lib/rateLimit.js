const store = new Map()

function getKey(ipAddress) {
  return ipAddress || 'unknown'
}

export function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }

  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown'
}

export function consumeRateLimit(key, { limit, windowMs }) {
  const normalizedKey = getKey(key)
  const now = Date.now()
  const current = store.get(normalizedKey)

  if (!current || current.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + windowMs,
    }
    store.set(normalizedKey, next)
    return {
      allowed: true,
      remaining: Math.max(limit - next.count, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  current.count += 1
  store.set(normalizedKey, current)

  return {
    allowed: current.count <= limit,
    remaining: Math.max(limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  }
}
