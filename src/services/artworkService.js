import { supabaseRequest } from './supabaseClient'

function normalizeArtwork(artwork) {
  const images =
    Array.isArray(artwork.images) && artwork.images.length > 0
      ? artwork.images
      : artwork.image
        ? [artwork.image]
        : []

  return {
    ...artwork,
    price: Number(artwork.price),
    images,
    image: images[0] || '',
    medium: artwork.medium || 'Not specified',
    size: artwork.size || 'Not specified',
    status: artwork.status || 'available',
  }
}

function createArtworkPayload(artworkInput) {
  const parsedImages = Array.isArray(artworkInput.images)
    ? artworkInput.images
    : String(artworkInput.images || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

  const payload = {
    ...artworkInput,
    price: Number(artworkInput.price),
    images: parsedImages,
    image: parsedImages[0] || '',
    medium: artworkInput.medium || '',
    size: artworkInput.size || '',
    status: artworkInput.status || 'available',
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

  if (payload.images.length === 0) {
    throw new Error('At least one image URL is required.')
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

  const data = await supabaseRequest('artworks', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  return normalizeArtwork(data[0])
}

export async function updateArtwork(id, artworkInput) {
  const payload = createArtworkPayload(artworkInput)

  const data = await supabaseRequest(`artworks?id=eq.${Number(id)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  return normalizeArtwork(data[0])
}

export async function updateArtworkStatus(id, status) {
  const data = await supabaseRequest(`artworks?id=eq.${Number(id)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ status }),
  })

  return normalizeArtwork(data[0])
}

export async function deleteArtwork(id) {
  await supabaseRequest(`artworks?id=eq.${Number(id)}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=minimal',
    },
  })

  return { id }
}
