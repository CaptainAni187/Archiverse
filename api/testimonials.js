import { requireAdminAuth } from './_lib/adminSession.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import {
  createTestimonial,
  fetchVisibleTestimonials,
} from './_lib/supabaseAdmin.js'
import {
  sendValidationError,
  testimonialPayloadSchema,
  validateWithSchema,
} from './_lib/validation.js'

function normalizeTestimonial(testimonial) {
  return {
    ...testimonial,
    rating: Number(testimonial.rating || 5),
    location: testimonial.location || '',
    is_visible: testimonial.is_visible !== false,
  }
}

async function handleFetchTestimonials(_req, res) {
  const testimonials = await fetchVisibleTestimonials()

  return sendJson(res, 200, {
    success: true,
    testimonials: testimonials.map(normalizeTestimonial),
  })
}

async function handleCreateTestimonial(req, res) {
  if (!requireAdminAuth(req, res)) {
    return null
  }

  const body = await readJson(req)
  const payload = validateWithSchema(testimonialPayloadSchema, body)
  const testimonial = await createTestimonial(payload)

  return sendJson(res, 201, {
    success: true,
    testimonial: normalizeTestimonial(testimonial),
  })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return await handleFetchTestimonials(req, res)
    }

    if (req.method === 'POST') {
      return await handleCreateTestimonial(req, res)
    }

    return methodNotAllowed(res, ['GET', 'POST'])
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to process testimonials.',
    })
  }
}
