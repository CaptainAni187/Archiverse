const EMPTY_IMAGE_INTELLIGENCE = {
  version: 1,
  generated_at: null,
  generator: 'ml/build_image_intelligence.py',
  framework: 'pytorch',
  artworks: [],
  similar_by_artwork_id: {},
  duplicate_candidates_by_artwork_id: {},
  failures: [],
}

let imageIntelligencePromise = null

function normalizeArtifact(payload) {
  if (!payload || typeof payload !== 'object') {
    return EMPTY_IMAGE_INTELLIGENCE
  }

  return {
    ...EMPTY_IMAGE_INTELLIGENCE,
    ...payload,
    artworks: Array.isArray(payload.artworks) ? payload.artworks : [],
    similar_by_artwork_id:
      payload.similar_by_artwork_id && typeof payload.similar_by_artwork_id === 'object'
        ? payload.similar_by_artwork_id
        : {},
    duplicate_candidates_by_artwork_id:
      payload.duplicate_candidates_by_artwork_id &&
      typeof payload.duplicate_candidates_by_artwork_id === 'object'
        ? payload.duplicate_candidates_by_artwork_id
        : {},
    failures: Array.isArray(payload.failures) ? payload.failures : [],
  }
}

export async function loadImageIntelligenceArtifact() {
  if (typeof window === 'undefined') {
    return EMPTY_IMAGE_INTELLIGENCE
  }

  if (!imageIntelligencePromise) {
    imageIntelligencePromise = fetch('/ml/artwork-intelligence.json')
      .then(async (response) => {
        if (!response.ok) {
          return EMPTY_IMAGE_INTELLIGENCE
        }

        return normalizeArtifact(await response.json())
      })
      .catch(() => EMPTY_IMAGE_INTELLIGENCE)
  }

  return imageIntelligencePromise
}

export function getSimilarArtworkMatches(artifact, artworkId, limit = 3) {
  const matches = artifact?.similar_by_artwork_id?.[String(artworkId)]
  return Array.isArray(matches) ? matches.slice(0, limit) : []
}

export function getDuplicateArtworkMatches(artifact, artworkId, limit = 3) {
  const matches = artifact?.duplicate_candidates_by_artwork_id?.[String(artworkId)]
  return Array.isArray(matches) ? matches.slice(0, limit) : []
}

export function getImageIntelligenceEntryByArtworkId(artifact, artworkId) {
  return Array.isArray(artifact?.artworks)
    ? artifact.artworks.find((entry) => Number(entry.artwork_id) === Number(artworkId)) || null
    : null
}

export function getImageIntelligenceEntryByImageUrl(artifact, imageUrl) {
  const normalizedUrl = String(imageUrl || '').trim()

  if (!normalizedUrl || !Array.isArray(artifact?.artworks)) {
    return null
  }

  return artifact.artworks.find((entry) => String(entry.image_url || '').trim() === normalizedUrl) || null
}

export function getImageTagSuggestions(artifact, artworkId, fallbackImageUrl = '') {
  const directEntry = getImageIntelligenceEntryByArtworkId(artifact, artworkId)
  const fallbackEntry = fallbackImageUrl
    ? getImageIntelligenceEntryByImageUrl(artifact, fallbackImageUrl)
    : null
  const entry = directEntry || fallbackEntry

  return Array.isArray(entry?.suggested_tags) ? entry.suggested_tags : []
}
