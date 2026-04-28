import { z } from 'zod'
import { requireAdminAuth } from './_lib/adminSession.js'
import { logAdminActivity } from './_lib/adminActivity.js'
import { methodNotAllowed, readJson, sendJson } from './_lib/http.js'
import {
  createCombo,
  createArtwork,
  deleteComboById,
  deleteArtwork,
  fetchComboById,
  fetchCombos,
  fetchArtworkById,
  fetchArtworks,
  updateComboById,
  updateArtwork,
} from './_lib/supabaseAdmin.js'
import {
  artworkPayloadSchema,
  comboPayloadSchema,
  sendValidationError,
  validateWithSchema,
} from './_lib/validation.js'
import {
  createArtworkSetKey,
  getActiveCombosForArtwork,
  hydrateCombo,
  mergeUniqueArtworks,
} from '../src/utils/comboPricing.js'

const artworkStatusSchema = z.object({
  status: z.enum(['available', 'sold']),
})

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

function isMissingOptionalArtworkColumn(error) {
  const message = String(error?.message || '')
  return (
    message.includes('column') &&
    ['category', 'is_featured', 'tags', 'instagram_url', 'featured_rank'].some((column) =>
      message.includes(column),
    ) &&
    message.includes('does not exist')
  )
}

function isMissingComboTableError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('relation') && message.includes('combos')
}

function withoutOptionalArtworkColumns(payload) {
  const {
    category: _category,
    is_featured: _isFeatured,
    tags: _tags,
    instagram_url: _instagramUrl,
    featured_rank: _featuredRank,
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
    tags: Array.isArray(artwork.tags) ? artwork.tags.filter(Boolean) : [],
    instagram_url: artwork.instagram_url || '',
    featured_rank: Number.isFinite(Number(artwork.featured_rank))
      ? Number(artwork.featured_rank)
      : null,
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

function getComboId(req) {
  return String(req.query?.comboId || '').trim()
}

function getQueryArtworkId(req) {
  const artworkId = req.query?.artworkId
  return Array.isArray(artworkId) ? Number(artworkId[0]) : Number(artworkId)
}

function normalizeCombo(combo, artworks = []) {
  const hydrated = hydrateCombo(combo, artworks)

  return {
    ...hydrated,
    discount_percent: Number(combo?.discount_percent || 0),
    is_active: combo?.is_active !== false,
    created_at: combo?.created_at || null,
  }
}

async function readComboContext() {
  const artworks = await fetchArtworks()
  let combos = []

  try {
    combos = await fetchCombos()
  } catch (error) {
    if (!isMissingComboTableError(error)) {
      throw error
    }
  }

  const normalizedArtworks = artworks.map(normalizeArtwork)

  return {
    artworks: normalizedArtworks,
    combos,
  }
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

  const normalizedArtwork = normalizeArtwork(artwork)
  let comboMatches = []

  try {
    const { artworks, combos } = await readComboContext()
    comboMatches = getActiveCombosForArtwork(combos, normalizedArtwork, artworks)
  } catch {
    comboMatches = []
  }

  return sendJson(res, 200, {
    success: true,
    data: {
      ...normalizedArtwork,
      combos: comboMatches,
    },
  })
}

async function handleFetchCombos(req, res) {
  const comboId = getComboId(req)
  const artworkId = getQueryArtworkId(req)
  const isAdminView = String(req.query?.admin || '').trim().toLowerCase() === 'true'

  if (isAdminView) {
    const session = await requireAdminAuth(req, res)
    if (!session) {
      return null
    }
  }

  const { artworks, combos } = await readComboContext()
  const normalizedCombos = combos.map((combo) => normalizeCombo(combo, artworks))
  const visibleCombos = isAdminView
    ? normalizedCombos
    : normalizedCombos.filter((combo) => combo.is_active && combo.isAvailable)

  if (comboId) {
    const combo = visibleCombos.find((entry) => entry.id === comboId)
    if (!combo) {
      return sendJson(res, 404, {
        success: false,
        error: 'COMBO_NOT_FOUND',
        message: 'Combo not found.',
      })
    }

    return sendJson(res, 200, {
      success: true,
      data: combo,
    })
  }

  const filteredCombos =
    Number.isInteger(artworkId) && artworkId > 0
      ? visibleCombos.filter((combo) => combo.artwork_ids.includes(artworkId))
      : visibleCombos

  return sendJson(res, 200, {
    success: true,
    data: filteredCombos,
  })
}

async function ensureComboArtworksExist(artworkIds) {
  const rows = await Promise.all(artworkIds.map((artworkId) => fetchArtworkById(artworkId)))
  if (rows.some((artwork) => !artwork)) {
    const error = new Error('All artworks in a combo must exist.')
    error.status = 400
    error.error = 'INVALID_COMBO_ARTWORKS'
    throw error
  }

  return rows.map(normalizeArtwork)
}

async function ensureComboSetUnique(artworkIds, currentComboId = '') {
  let combos = []

  try {
    combos = await fetchCombos()
  } catch (error) {
    if (!isMissingComboTableError(error)) {
      throw error
    }
  }
  const candidateKey = createArtworkSetKey(artworkIds)
  const duplicateCombo = combos.find(
    (combo) => combo.id !== currentComboId && createArtworkSetKey(combo.artwork_ids || []) === candidateKey,
  )

  if (duplicateCombo) {
    const error = new Error('A combo with the same artwork set already exists.')
    error.status = 409
    error.error = 'DUPLICATE_COMBO'
    throw error
  }
}

async function handleCreateCombo(req, res) {
  const session = await requireAdminAuth(req, res)
  if (!session) {
    return null
  }

  const payload = validateWithSchema(comboPayloadSchema, await readJson(req))
  const artworkIds = mergeUniqueArtworks(
    payload.artwork_ids.map((artworkId) => ({ id: Number(artworkId) })),
  ).map((artwork) => Number(artwork.id))

  if (artworkIds.length < 2 || artworkIds.length > 5) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_COMBO_SIZE',
      message: 'A combo must contain between 2 and 5 unique artworks.',
    })
  }

  await ensureComboArtworksExist(artworkIds)
  await ensureComboSetUnique(artworkIds)

  const combo = await createCombo({
    title: payload.title,
    artwork_ids: artworkIds,
    discount_percent: payload.discount_percent,
    is_active: payload.is_active,
  })
  const { artworks } = await readComboContext()

  await logAdminActivity(session, {
    action_type: 'combo_added',
    resource_type: 'combo',
    resource_id: combo?.id,
    details: {
      title: combo?.title || payload.title,
      artwork_ids: artworkIds,
    },
  })

  return sendJson(res, 201, {
    success: true,
    data: normalizeCombo(combo, artworks),
  })
}

async function handleUpdateCombo(req, res) {
  const session = await requireAdminAuth(req, res)
  if (!session) {
    return null
  }

  const comboId = getComboId(req)
  if (!comboId) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_COMBO_ID',
      message: 'A valid combo id is required.',
    })
  }

  const existingCombo = await fetchComboById(comboId)
  if (!existingCombo) {
    return sendJson(res, 404, {
      success: false,
      error: 'COMBO_NOT_FOUND',
      message: 'Combo not found.',
    })
  }

  const payload = validateWithSchema(comboPayloadSchema, await readJson(req))
  const artworkIds = mergeUniqueArtworks(
    payload.artwork_ids.map((artworkId) => ({ id: Number(artworkId) })),
  ).map((artwork) => Number(artwork.id))

  if (artworkIds.length < 2 || artworkIds.length > 5) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_COMBO_SIZE',
      message: 'A combo must contain between 2 and 5 unique artworks.',
    })
  }

  await ensureComboArtworksExist(artworkIds)
  await ensureComboSetUnique(artworkIds, comboId)

  const combo = await updateComboById(comboId, {
    title: payload.title,
    artwork_ids: artworkIds,
    discount_percent: payload.discount_percent,
    is_active: payload.is_active,
  })
  const { artworks } = await readComboContext()

  await logAdminActivity(session, {
    action_type: 'combo_edited',
    resource_type: 'combo',
    resource_id: comboId,
    details: {
      title: combo?.title || payload.title,
      artwork_ids: artworkIds,
      is_active: payload.is_active,
    },
  })

  return sendJson(res, 200, {
    success: true,
    data: normalizeCombo(combo, artworks),
  })
}

async function handleDeleteCombo(req, res) {
  const session = await requireAdminAuth(req, res)
  if (!session) {
    return null
  }

  const comboId = getComboId(req)
  if (!comboId) {
    return sendJson(res, 400, {
      success: false,
      error: 'INVALID_COMBO_ID',
      message: 'A valid combo id is required.',
    })
  }

  const existingCombo = await fetchComboById(comboId)
  if (!existingCombo) {
    return sendJson(res, 404, {
      success: false,
      error: 'COMBO_NOT_FOUND',
      message: 'Combo not found.',
    })
  }

  await deleteComboById(comboId)
  await logAdminActivity(session, {
    action_type: 'combo_deleted',
    resource_type: 'combo',
    resource_id: comboId,
    details: {
      title: existingCombo.title || null,
      artwork_ids: Array.isArray(existingCombo.artwork_ids) ? existingCombo.artwork_ids : [],
    },
  })

  return sendJson(res, 200, {
    success: true,
    data: { id: comboId },
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
    if (
      isMissingCategoryColumn(error) ||
      isMissingFeaturedColumn(error) ||
      isMissingOptionalArtworkColumn(error)
    ) {
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
  const existingArtwork = await fetchArtworkById(artworkId)
  const featuredChanged =
    existingArtwork && existingArtwork.is_featured !== payload.is_featured

  try {
    const artwork = await updateArtwork(artworkId, {
      ...withStockStatus(payload),
      image: payload.images[0],
    })

    await logAdminActivity(session, {
      action_type: featuredChanged ? 'artwork_featured' : 'artwork_edited',
      resource_type: 'artwork',
      resource_id: artworkId,
      details: {
        title: artwork?.title || payload.title,
        is_featured: payload.is_featured,
      },
    })

    return sendJson(res, 200, {
      success: true,
      data: normalizeArtwork(artwork),
    })
  } catch (error) {
    if (
      isMissingCategoryColumn(error) ||
      isMissingFeaturedColumn(error) ||
      isMissingOptionalArtworkColumn(error)
    ) {
      const artwork = await updateArtwork(
        artworkId,
        {
          ...withoutOptionalArtworkColumns(payload),
          ...withStockStatus(payload),
          image: payload.images[0],
        },
      )

      await logAdminActivity(session, {
        action_type: featuredChanged ? 'artwork_featured' : 'artwork_edited',
        resource_type: 'artwork',
        resource_id: artworkId,
        details: {
          title: artwork?.title || payload.title,
          is_featured: payload.is_featured,
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

    if (req.method === 'GET' && action === 'combos') {
      return await handleFetchCombos(req, res)
    }

    if (req.method === 'POST' && action === 'combos') {
      return await handleCreateCombo(req, res)
    }

    if ((req.method === 'PUT' || req.method === 'PATCH') && action === 'combos') {
      return await handleUpdateCombo(req, res)
    }

    if (req.method === 'DELETE' && action === 'combos') {
      return await handleDeleteCombo(req, res)
    }

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

    return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
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
