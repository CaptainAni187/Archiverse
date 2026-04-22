import { z } from 'zod'
import { requireAdminAuth } from './_lib/adminSession.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import {
  createArtwork,
  deleteArtwork,
  fetchArtworkById,
  fetchArtworks,
  updateArtwork,
} from './_lib/supabaseAdmin.js'
import {
  artworkPayloadSchema,
  sendValidationError,
  validateWithSchema,
} from './_lib/validation.js'

const artworkStatusSchema = z.object({
  status: z.enum(['available', 'sold']),
})

function withoutCategory(payload) {
  const { category: _category, ...rest } = payload
  return rest
}

function isMissingCategoryColumn(error) {
  const message = String(error?.message || '')
  return message.includes('column') && message.includes('category') && message.includes('does not exist')
}

function isMissingFeaturedColumn(error) {
  const message = String(error?.message || '')
  return (
    message.includes('column') &&
    message.includes('is_featured') &&
    message.includes('does not exist')
  )
}

function withoutOptionalArtworkColumns(payload) {
  const {
    category: _category,
    is_featured: _isFeatured,
    ...rest
  } = payload

  return rest
}

function normalizeArtwork(artwork) {
  const images = Array.isArray(artwork.images)
    ? artwork.images.filter((image) => typeof image === 'string' && image.trim())
    : []

  return {
    ...artwork,
    price: Number(artwork.price),
    images,
    is_featured: artwork.is_featured === true,
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
  const artworkId = req.query?.id
  return Array.isArray(artworkId) ? Number(artworkId[0]) : Number(artworkId)
}

function getAction(req) {
  return String(req.query?.action || '').trim().toLowerCase()
}

async function handleFetchArtworks(_req, res) {
  const artworks = await fetchArtworks()
  return sendJson(res, 200, {
    success: true,
    data: artworks.map(normalizeArtwork),
  })
}

async function handleFetchArtwork(req, res) {
  const artworkId = getArtworkId(req)

  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_ARTWORK_ID',
      message: 'A valid artwork id is required.',
    })
  }

  const artwork = await fetchArtworkById(artworkId)
  if (!artwork) {
    return sendJson(res, 404, {
      success: false,
      error: 'ARTWORK_NOT_FOUND',
      message: 'Artwork not found.',
    })
  }

  return sendJson(res, 200, {
    success: true,
    data: normalizeArtwork(artwork),
  })
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
      image: payload.images[0],
    })

    return sendJson(res, 201, {
      success: true,
      data: normalizeArtwork(artwork),
    })
  } catch (error) {
    if (isMissingCategoryColumn(error) || isMissingFeaturedColumn(error)) {
      const artwork = await createArtwork({
        ...withoutOptionalArtworkColumns(payload),
        ...withStockStatus(payload),
        image: payload.images[0],
      })

      return sendJson(res, 201, {
        success: true,
        data: normalizeArtwork(artwork),
      })
    }

    throw error
  }
}

async function handleUpdateArtwork(req, res) {
  if (!requireAdminAuth(req, res)) {
    return null
  }

  const artworkId = getArtworkId(req)
  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_ARTWORK_ID',
      message: 'A valid artwork id is required.',
    })
  }

  const body = await readJson(req)
  const payload = validateWithSchema(artworkPayloadSchema, body)

  try {
    const artwork = await updateArtwork(artworkId, {
      ...withStockStatus(payload),
      image: payload.images[0],
    })

    return sendJson(res, 200, {
      success: true,
      data: normalizeArtwork(artwork),
    })
  } catch (error) {
    if (isMissingCategoryColumn(error) || isMissingFeaturedColumn(error)) {
      const artwork = await updateArtwork(
        artworkId,
        {
          ...withoutOptionalArtworkColumns(payload),
          ...withStockStatus(payload),
          image: payload.images[0],
        },
      )

      return sendJson(res, 200, {
        success: true,
        data: normalizeArtwork(artwork),
      })
    }

    throw error
  }
}

async function handleUpdateArtworkStatus(req, res) {
  if (!requireAdminAuth(req, res)) {
    return null
  }

  const artworkId = getArtworkId(req)
  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_ARTWORK_ID',
      message: 'A valid artwork id is required.',
    })
  }

  const body = await readJson(req)
  const payload = validateWithSchema(artworkStatusSchema, body)
  const artwork = await updateArtwork(artworkId, payload)

  return sendJson(res, 200, {
    success: true,
    data: normalizeArtwork(artwork),
  })
}

async function handleDeleteArtwork(req, res) {
  if (!requireAdminAuth(req, res)) {
    return null
  }

  const artworkId = getArtworkId(req)
  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_ARTWORK_ID',
      message: 'A valid artwork id is required.',
    })
  }

  await deleteArtwork(artworkId)
  return sendJson(res, 200, {
    success: true,
    data: { id: artworkId },
  })
}

export default async function handler(req, res) {
  try {
    const artworkId = getArtworkId(req)
    const action = getAction(req)

    if (req.method === 'GET' && Number.isInteger(artworkId) && artworkId > 0) {
      return await handleFetchArtwork(req, res)
    }

    if (req.method === 'GET') {
      return await handleFetchArtworks(req, res)
    }

    if (req.method === 'POST') {
      return await handleCreateArtwork(req, res)
    }

    if (req.method === 'PUT' && action === 'status') {
      return await handleUpdateArtworkStatus(req, res)
    }

    if (req.method === 'PUT') {
      return await handleUpdateArtwork(req, res)
    }

    if (req.method === 'DELETE') {
      return await handleDeleteArtwork(req, res)
    }

    return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE'])
  } catch (error) {
    if (error.validationIssues) {
      return sendValidationError(res, error.validationIssues)
    }

    return sendJson(res, error.status || 500, {
      success: false,
      error: error.error || 'ARTWORK_REQUEST_FAILED',
      message: error.message || 'Unable to process artwork request.',
    })
  }
}
