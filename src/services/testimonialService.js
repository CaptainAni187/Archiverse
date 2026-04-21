import { backendAdminRequest, backendRequest } from './backendApiService'

function normalizeTestimonial(testimonial) {
  return {
    ...testimonial,
    rating: Number(testimonial.rating || 5),
    location: testimonial.location || '',
  }
}

export async function fetchTestimonials() {
  const payload = await backendRequest('/api/testimonials')
  return payload.testimonials.map(normalizeTestimonial)
}

export async function addTestimonial(testimonialInput) {
  const payload = await backendAdminRequest('/api/testimonials', {
    method: 'POST',
    body: JSON.stringify(testimonialInput),
  })

  return normalizeTestimonial(payload.testimonial)
}
