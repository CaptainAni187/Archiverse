import { backendAdminRequest } from './backendApiService'
import { supabaseRequest } from './supabaseClient'
import { getPrimaryArtworkImage, normalizeArtworkImages } from '../utils/artworkImages'

function withoutCategory(payload) {
  const { category: _category, ...rest } = payload
  return rest
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

function createArtworkPayload(artworkInput) {
  const parsedImages = normalizeArtworkImages(artworkInput.images)

  const normalizedCategory = String(artworkInput.category || '').trim().toLowerCase()
  const category = normalizedCategory === 'sketch' ? 'sketch' : 'canvas'

  const payload = {
    ...artworkInput,
    price: Number(artworkInput.price),
    images: parsedImages,
    image: getPrimaryArtworkImage(parsedImages),
    medium: artworkInput.medium || '',
    size: artworkInput.size || '',
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
  const data = await supabaseRequest('artworks?select=*&order=id.asc')
  return data.map(normalizeArtwork)
}

export async function fetchSingleArtwork(id) {
  const data = await supabaseRequest(`artworks?select=*&id=eq.${Number(id)}&limit=1`)
  return data[0] ? normalizeArtwork(data[0]) : null
}

export async function addArtwork(artworkInput) {
  const payload = createArtworkPayload(artworkInput)
  const requestPayload = payload.category ? payload : withoutCategory(payload)
  const response = await backendAdminRequest('/api/artworks', {
    method: 'POST',
    body: JSON.stringify(requestPayload),
  })

  return normalizeArtwork(response.artwork)
}

export async function updateArtwork(id, artworkInput) {
  const payload = createArtworkPayload(artworkInput)
  const requestPayload = payload.category ? payload : withoutCategory(payload)
  const response = await backendAdminRequest(`/api/artworks/${Number(id)}`, {
    method: 'PUT',
    body: JSON.stringify(requestPayload),
  })

  return normalizeArtwork(response.artwork)
}

export async function updateArtworkStatus(id, status) {
  const response = await backendAdminRequest(`/api/artworks/${Number(id)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })

  return normalizeArtwork(response.artwork)
}

export async function deleteArtwork(id) {
  await backendAdminRequest(`/api/artworks/${Number(id)}`, {
    method: 'DELETE',
  })

  return { id }
}
