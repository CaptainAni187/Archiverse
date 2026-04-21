import { requireAdminAuth } from '../_lib/adminSession.js'
import { getPrimaryArtworkImage, normalizeArtworkImages } from '../_lib/artworkImages.js'
import { methodNotAllowed, readJson, sendJson } from '../_lib/http.js'
import {
  deleteArtwork,
  fetchArtworkById,
  updateArtwork,
} from '../_lib/supabaseAdmin.js'
import {
  artworkPayloadSchema,
  sendValidationError,
  validateWithSchema,
} from '../_lib/validation.js'

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

function getArtworkId(req) {
  return Number(req.query.id)
}

async function handleFetchArtwork(req, res) {
  const artworkId = getArtworkId(req)

  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return sendJson(res, 400, {
      success: false,
      message: 'A valid artwork id is required.',
    })
  }

  const artwork = await fetchArtworkById(artworkId)
  if (!artwork) {
    return sendJson(res, 404, {
      success: false,
      message: 'Artwork not found.',
    })
  }

  return sendJson(res, 200, {
    success: true,
    artwork: normalizeArtwork(artwork),
  })
}

async function handleUpdateArtwork(req, res) {
  if (!requireAdminAuth(req, res)) {
    return null
  }

  const artworkId = getArtworkId(req)
  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return sendJson(res, 400, {
      success: false,
      message: 'A valid artwork id is required.',
    })
  }

  const body = await readJson(req)
  const payload = validateWithSchema(artworkPayloadSchema, body)

  try {
    const artwork = await updateArtwork(artworkId, {
      ...withStockStatus(payload),
      image: getPrimaryArtworkImage(payload.images),
    })

    return sendJson(res, 200, {
      success: true,
      artwork: normalizeArtwork(artwork),
    })
  } catch (error) {
    if (!payload.category || !isMissingCategoryColumn(error)) {
      throw error
    }

    const artwork = await updateArtwork(
      artworkId,
      withoutCategory({
        ...withStockStatus(payload),
        image: getPrimaryArtworkImage(payload.images),
      }),
    )

    return sendJson(res, 200, {
      success: true,
      artwork: normalizeArtwork(artwork),
    })
  }
}

async function handleDeleteArtwork(req, res) {
  if (!requireAdminAuth(req, res)) {
    return null
  }

  const artworkId = getArtworkId(req)
  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return sendJson(res, 400, {
      success: false,
      message: 'A valid artwork id is required.',
    })
  }

  await deleteArtwork(artworkId)
  return sendJson(res, 200, {
    success: true,
    id: artworkId,
  })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return await handleFetchArtwork(req, res)
    }

    if (req.method === 'PUT') {
      return await handleUpdateArtwork(req, res)
    }

    if (req.method === 'DELETE') {
      return await handleDeleteArtwork(req, res)
    }

    return methodNotAllowed(res, ['GET', 'PUT', 'DELETE'])
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
