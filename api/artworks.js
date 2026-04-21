import { requireAdminAuth } from './_lib/adminSession.js'
import { getPrimaryArtworkImage, normalizeArtworkImages } from './_lib/artworkImages.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import {
  createArtwork,
  fetchArtworks,
} from './_lib/supabaseAdmin.js'
import {
  artworkPayloadSchema,
  sendValidationError,
  validateWithSchema,
} from './_lib/validation.js'

function withoutCategory(payload) {
  const { category: _category, ...rest } = payload
  return rest
}

function isMissingCategoryColumn(error) {
  const message = String(error?.message || '')
  return message.includes('column') && message.includes('category') && message.includes('does not exist')
}

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

function withStockStatus(payload) {
  return {
    ...payload,
    status: Number(payload.quantity) <= 0 ? 'sold' : payload.status,
  }
}

async function handleCreateArtwork(req, res) {
  if (!requireAdminAuth(req, res)) {
    return null
  }

  const body = await readJson(req)
  const payload = validateWithSchema(artworkPayloadSchema, body)

  try {
    const artwork = await createArtwork({
      ...withStockStatus(payload),
      image: getPrimaryArtworkImage(payload.images),
    })

    return sendJson(res, 201, {
      success: true,
      artwork: normalizeArtwork(artwork),
    })
  } catch (error) {
    if (!payload.category || !isMissingCategoryColumn(error)) {
      throw error
    }

    const artwork = await createArtwork(
      withoutCategory({
        ...payload,
        ...withStockStatus(payload),
        image: getPrimaryArtworkImage(payload.images),
      }),
    )

    return sendJson(res, 201, {
      success: true,
      artwork: normalizeArtwork(artwork),
    })
  }
}

async function handleFetchArtworks(_req, res) {
  const artworks = await fetchArtworks()
  return sendJson(res, 200, {
    success: true,
    artworks: artworks.map(normalizeArtwork),
  })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return await handleFetchArtworks(req, res)
    }

    if (req.method === 'POST') {
      return await handleCreateArtwork(req, res)
    }

    return methodNotAllowed(res, ['GET', 'POST'])
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to process artwork request.',
    })
  }
}
