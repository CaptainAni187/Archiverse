import { z } from 'zod'
import { logAnalyticsEvent } from './_lib/analytics.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import { sendValidationError, validateWithSchema } from './_lib/validation.js'

const analyticsEventSchema = z.object({
  event_type: z.enum(['artwork_view', 'checkout_started', 'order_completed']),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  try {
    const body = await readJson(req)
    const payload = validateWithSchema(analyticsEventSchema, body)

    await logAnalyticsEvent(payload)

    return sendJson(res, 202, {
      success: true,
      data: {
        accepted: true,
      },
    })
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      error: error.error || 'ANALYTICS_REQUEST_FAILED',
      message: error.message || 'Unable to log analytics event.',
    })
  }
}
