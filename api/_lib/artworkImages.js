export function normalizeArtworkImages(input) {
  const source = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : []

  const normalized = source
    .map((item, index) => {
      if (typeof item === 'string') {
        const url = item.trim()
        return url
          ? {
              url,
              is_primary: index === 0,
            }
          : null
      }

      if (item && typeof item === 'object') {
        const url = String(item.url || '').trim()
        if (!url) {
          return null
        }

        return {
          url,
          is_primary: Boolean(item.is_primary),
        }
      }

      return null
    })
    .filter(Boolean)

  if (normalized.length === 0) {
    return []
  }

  const primaryIndex = normalized.findIndex((item) => item.is_primary)
  const safePrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0

  return normalized.map((item, index) => ({
    url: item.url,
    is_primary: index === safePrimaryIndex,
  }))
}

export function getPrimaryArtworkImage(images, fallbackImage = '') {
  const normalized = normalizeArtworkImages(images)
  return normalized.find((item) => item.is_primary)?.url || normalized[0]?.url || fallbackImage || ''
}
