import { requireAdminAuth } from '../../_lib/adminSession.js'
import { getPrimaryArtworkImage, normalizeArtworkImages } from '../../_lib/artworkImages.js'
import { methodNotAllowed, readJson, sendJson } from '../../_lib/http.js'
import { updateArtwork } from '../../_lib/supabaseAdmin.js'
import { sendValidationError, validateWithSchema } from '../../_lib/validation.js'
import { z } from 'zod'

const artworkStatusSchema = z.object({
  status: z.enum(['available', 'sold']),
})

function normalizeArtwork(artwork) {
  const images = normalizeArtworkImages(
    Array.isArray(artwork.images) && artwork.images.length > 0
      ? artwork.images
      : artwork.image
        ? [artwork.image]
        : [],
  )
  const primaryImage = getPrimaryArtworkImage(images, artwork.image)

  return {
    ...artwork,
    price: Number(artwork.price),
    images,
    image: primaryImage,
    medium: artwork.medium || 'Not specified',
    size: artwork.size || 'Not specified',
    quantity: Number.isFinite(Number(artwork.quantity)) ? Number(artwork.quantity) : 1,
    status:
      Number(artwork.quantity) <= 0 ? 'sold' : artwork.status || 'available',
    category: artwork.category || '',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return methodNotAllowed(res, ['PUT'])
  }

  try {
    if (!requireAdminAuth(req, res)) {
      return null
    }

    const artworkId = Number(req.query.id)
    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return sendJson(res, 400, {
        success: false,
        message: 'A valid artwork id is required.',
      })
    }

    const body = await readJson(req)
    const payload = validateWithSchema(artworkStatusSchema, body)
    const artwork = await updateArtwork(artworkId, payload)

    return sendJson(res, 200, {
      success: true,
      artwork: normalizeArtwork(artwork),
    })
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to update artwork status.',
    })
  }
}
