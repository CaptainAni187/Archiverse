import { z } from 'zod'
import { requireAdminAuth } from './_lib/adminSession.js'
import { logAdminActivity } from './_lib/adminActivity.js'
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
  const images = [
    ...(Array.isArray(artwork.images) ? artwork.images : []),
    typeof artwork.image === 'string' ? artwork.image : '',
  ].filter((image, index, collection) => {
    return typeof image === 'string' && image.trim() && collection.indexOf(image) === index
  })

  return {
    ...artwork,
    price: Number(artwork.price),
    images,
    image: images[0] || '',
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
  const session = await requireAdminAuth(req, res)
  if (!session) {
    return null
  }

  const body = await readJson(req)
  const payload = validateWithSchema(artworkPayloadSchema, body)

  try {
    const artwork = await createArtwork({
      ...withStockStatus(payload),
      image: payload.images[0],
    })

    await logAdminActivity(session, {
      action_type: 'artwork_added',
      resource_type: 'artwork',
      resource_id: artwork?.id,
      details: {
        title: artwork?.title || payload.title,
      },
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

      await logAdminActivity(session, {
        action_type: 'artwork_added',
        resource_type: 'artwork',
        resource_id: artwork?.id,
        details: {
          title: artwork?.title || payload.title,
        },
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
  const session = await requireAdminAuth(req, res)
  if (!session) {
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

    await logAdminActivity(session, {
      action_type: 'artwork_edited',
      resource_type: 'artwork',
      resource_id: artworkId,
      details: {
        title: artwork?.title || payload.title,
      },
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

      await logAdminActivity(session, {
        action_type: 'artwork_edited',
        resource_type: 'artwork',
        resource_id: artworkId,
        details: {
          title: artwork?.title || payload.title,
        },
      })

      return sendJson(res, 200, {
        success: true,
        data: normalizeArtwork(artwork),
      })
    }

    throw error
  }
}

async function handleUpdateArtworkStatus(req, res) {
  const session = await requireAdminAuth(req, res)
  if (!session) {
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

  await logAdminActivity(session, {
    action_type: 'artwork_status_changed',
    resource_type: 'artwork',
    resource_id: artworkId,
    details: {
      status: payload.status,
      title: artwork?.title || null,
    },
  })

  return sendJson(res, 200, {
    success: true,
    data: normalizeArtwork(artwork),
  })
}

async function handleDeleteArtwork(req, res) {
  const session = await requireAdminAuth(req, res)
  if (!session) {
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

  const existingArtwork = await fetchArtworkById(artworkId)
  await deleteArtwork(artworkId)

  await logAdminActivity(session, {
    action_type: 'artwork_deleted',
    resource_type: 'artwork',
    resource_id: artworkId,
    details: {
      title: existingArtwork?.title || null,
    },
  })

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
