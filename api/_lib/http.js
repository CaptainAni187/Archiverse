export async function readJson(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }

  if (typeof req.body === 'string' && req.body.length > 0) {
    return JSON.parse(req.body)
  }

  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')
  return rawBody ? JSON.parse(rawBody) : {}
}

export function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload)
}

export function unauthorized(res, message = 'Unauthorized.') {
  return sendJson(res, 401, {
    success: false,
    message,
  })
}

export function forbidden(res, message = 'Forbidden.') {
  return sendJson(res, 403, {
    success: false,
    message,
  })
}

export function methodNotAllowed(res, allowedMethods) {
  res.setHeader('Allow', allowedMethods.join(', '))
  return sendJson(res, 405, {
    success: false,
    message: `Method not allowed. Use ${allowedMethods.join(', ')}.`,
  })
}
