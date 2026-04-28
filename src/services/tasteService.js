import {
  buildRecommendationSet,
  createEmptyTasteProfile,
  explainArtworkRecommendation,
  mergeTasteProfileForEvent,
  rankArtworksForTaste,
  suggestArtworkTags as suggestTagsForArtwork,
} from '../../shared/ai/foundation.js'

const TASTE_PROFILE_STORAGE_KEY = 'archiverse_taste_profile'
const TASTE_RESET_EVENT = 'archiverse:taste-reset'

function readProfileFromStorage() {
  if (typeof window === 'undefined') {
    return createEmptyTasteProfile()
  }

  try {
    const rawProfile = window.localStorage.getItem(TASTE_PROFILE_STORAGE_KEY)
    return rawProfile ? JSON.parse(rawProfile) : createEmptyTasteProfile()
  } catch {
    return createEmptyTasteProfile()
  }
}

function writeProfileToStorage(profile) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(TASTE_PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

export function getTasteProfile() {
  return readProfileFromStorage()
}

export function updateTasteProfileFromEvent(eventType, metadata = {}) {
  const nextProfile = mergeTasteProfileForEvent(readProfileFromStorage(), {
    event_type: eventType,
    metadata,
    timestamp: new Date().toISOString(),
  })

  writeProfileToStorage(nextProfile)
  return nextProfile
}

export function getArtworkTasteMetadata(artwork = {}, extra = {}) {
  return {
    artwork_id: artwork.id,
    id: artwork.id,
    title: artwork.title,
    category: artwork.category || '',
    tags: Array.isArray(artwork.tags) ? artwork.tags : [],
    price: Number.isFinite(Number(artwork.price)) ? Number(artwork.price) : null,
    artwork: {
      id: artwork.id,
      title: artwork.title,
      category: artwork.category || '',
      tags: Array.isArray(artwork.tags) ? artwork.tags : [],
      price: Number.isFinite(Number(artwork.price)) ? Number(artwork.price) : null,
      medium: artwork.medium || '',
      description: artwork.description || '',
      is_featured: artwork.is_featured === true,
      featured_rank: artwork.featured_rank ?? null,
    },
    ...extra,
  }
}

export function hasTasteSignals(profile = readProfileFromStorage()) {
  return (
    Object.keys(profile.category_weights || {}).length > 0 ||
    Object.keys(profile.tag_weights || {}).length > 0 ||
    Object.keys(profile.artwork_weights || {}).length > 0 ||
    Number(profile.price_preference?.total_weight || 0) > 0
  )
}

export function rankArtworksByTaste(artworks = [], profile = readProfileFromStorage()) {
  if (!hasTasteSignals(profile)) {
    return artworks
  }

  return rankArtworksForTaste(artworks, profile)
}

export function getRecommendedArtworks(artworks = [], limit = 4, profile = readProfileFromStorage()) {
  if (!hasTasteSignals(profile)) {
    return []
  }

  return buildRecommendationSet(artworks, profile, limit)
}

export function getRecommendationReason(artwork, profile = readProfileFromStorage()) {
  return explainArtworkRecommendation(artwork, profile)
}

export function getAutoTagSuggestions(artwork) {
  return suggestTagsForArtwork(artwork)
}

export function resetTastePreferences() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(TASTE_PROFILE_STORAGE_KEY)
  window.dispatchEvent(new Event(TASTE_RESET_EVENT))
}

export function onTastePreferencesReset(callback) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener(TASTE_RESET_EVENT, callback)
  return () => window.removeEventListener(TASTE_RESET_EVENT, callback)
}
