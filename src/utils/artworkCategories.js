function getArtworkText(artwork) {
  return `${artwork.title || ''} ${artwork.medium || ''} ${artwork.description || ''}`.toLowerCase()
}

export function isSketchArtwork(artwork) {
  if (artwork?.category) {
    return String(artwork.category).toLowerCase() === 'sketch'
  }
  const text = getArtworkText(artwork)
  return [
    'sketch',
    'graphite',
    'charcoal',
    'pencil',
    'ink',
    'portrait study',
    'linework',
  ].some((keyword) => text.includes(keyword))
}

export function isCanvasArtwork(artwork) {
  if (artwork?.category) {
    return String(artwork.category).toLowerCase() === 'canvas'
  }
  return !isSketchArtwork(artwork)
}

export function getCanvasArtworks(artworks) {
  return artworks.filter(isCanvasArtwork)
}

export function getSketchArtworks(artworks) {
  return artworks.filter(isSketchArtwork)
}
