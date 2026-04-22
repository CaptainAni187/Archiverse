import { backendAdminRequest } from './backendApiService'
import { supabaseRequest } from './supabaseClient'

let artworksCache = null
const artworkByIdCache = new Map()

function withoutCategory(payload) {
  const { category: _category, ...rest } = payload
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

function createArtworkPayload(artworkInput) {
  const parsedImages = Array.isArray(artworkInput.images)
    ? artworkInput.images
        .map((image) => (typeof image === 'string' ? image.trim() : ''))
        .filter(Boolean)
    : []

  const normalizedCategory = String(artworkInput.category || '').trim().toLowerCase()
  const category = normalizedCategory === 'sketch' ? 'sketch' : 'canvas'

  const payload = {
    ...artworkInput,
    price: Number(artworkInput.price),
    images: parsedImages,
    image: parsedImages[0] || '',
    medium: artworkInput.medium || '',
    size: artworkInput.size || '',
    is_featured: artworkInput.is_featured === true,
    quantity: Number.isFinite(Number(artworkInput.quantity))
      ? Math.max(0, Math.trunc(Number(artworkInput.quantity)))
      : 1,
    status: artworkInput.status || 'available',
    category,
  }

  if (payload.quantity <= 0) {
    payload.status = 'sold'
  }

  if (!payload.title?.trim()) {
    throw new Error('Artwork title is required.')
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    throw new Error('Artwork price must be greater than 0.')
  }

  if (!payload.description?.trim()) {
    throw new Error('Artwork description is required.')
  }

  if (payload.images.length === 0 || payload.images.length > 5) {
    throw new Error('Artwork must include between 1 and 5 images.')
  }

  return payload
}

export async function fetchArtworks() {
  if (artworksCache) {
    return artworksCache
  }

  const data = await supabaseRequest('artworks?select=*&order=id.asc')
  const normalized = data.map(normalizeArtwork)
  artworksCache = normalized

  normalized.forEach((artwork) => {
    artworkByIdCache.set(Number(artwork.id), artwork)
  })

  return normalized
}

export async function fetchSingleArtwork(id) {
  const normalizedId = Number(id)

  if (artworkByIdCache.has(normalizedId)) {
    return artworkByIdCache.get(normalizedId)
  }

  const data = await supabaseRequest(`artworks?select=*&id=eq.${Number(id)}&limit=1`)
  const normalized = data[0] ? normalizeArtwork(data[0]) : null

  if (normalized) {
    artworkByIdCache.set(normalizedId, normalized)
  }

  return normalized
}

export async function addArtwork(artworkInput) {
  const payload = createArtworkPayload(artworkInput)
  const requestPayload = payload.category ? payload : withoutCategory(payload)
  const response = await backendAdminRequest('/api/artworks', {
    method: 'POST',
    body: JSON.stringify(requestPayload),
  })

  const normalized = normalizeArtwork(response.data)
  artworksCache = null
  artworkByIdCache.set(Number(normalized.id), normalized)
  return normalized
}

export async function updateArtwork(id, artworkInput) {
  const payload = createArtworkPayload(artworkInput)
  const requestPayload = payload.category ? payload : withoutCategory(payload)
  const response = await backendAdminRequest(`/api/artworks/${Number(id)}`, {
    method: 'PUT',
    body: JSON.stringify(requestPayload),
  })

  const normalized = normalizeArtwork(response.data)
  artworksCache = null
  artworkByIdCache.set(Number(normalized.id), normalized)
  return normalized
}

export async function updateArtworkStatus(id, status) {
  const response = await backendAdminRequest(`/api/artworks/${Number(id)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })

  const normalized = normalizeArtwork(response.data)
  artworksCache = null
  artworkByIdCache.set(Number(normalized.id), normalized)
  return normalized
}

export async function deleteArtwork(id) {
  await backendAdminRequest(`/api/artworks/${Number(id)}`, {
    method: 'DELETE',
  })

  artworksCache = null
  artworkByIdCache.delete(Number(id))

  return { id }
}
