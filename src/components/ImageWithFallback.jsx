import { useMemo, useState } from 'react'

const fallbackSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' fill='%236b7280' font-size='28' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif'%3EImage unavailable%3C/text%3E%3C/svg%3E"

const UNSPLASH_WIDTHS = [480, 768, 1024, 1400, 1800, 2200]

function isUnsplashImage(src) {
  return typeof src === 'string' && src.includes('images.unsplash.com')
}

function buildUnsplashUrl(src, width) {
  if (!isUnsplashImage(src)) {
    return src
  }

  try {
    const url = new URL(src)
    url.searchParams.set('auto', 'format')
    url.searchParams.set('fit', 'crop')
    url.searchParams.set('q', '80')
    url.searchParams.set('w', String(width))
    return url.toString()
  } catch {
    return src
  }
}

function createResponsiveImage(src, maxWidth) {
  if (!isUnsplashImage(src)) {
    return {
      src,
      srcSet: undefined,
    }
  }

  const candidateWidths = UNSPLASH_WIDTHS.filter((width) => width <= maxWidth)
  const widths = candidateWidths.length > 0 ? candidateWidths : [maxWidth]
  const finalWidth = widths[widths.length - 1]

  return {
    src: buildUnsplashUrl(src, finalWidth),
    srcSet: widths.map((width) => `${buildUnsplashUrl(src, width)} ${width}w`).join(', '),
  }
}

function ImageWithFallback({
  src,
  alt,
  className,
  loading = 'lazy',
  fetchPriority,
  sizes,
  maxWidth = 1400,
}) {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const optimizedImage = useMemo(() => createResponsiveImage(src, maxWidth), [maxWidth, src])
  const imageSrc = hasError || !optimizedImage.src ? fallbackSvg : optimizedImage.src

  return (
    <span className={`image-with-fallback ${isLoaded ? 'is-loaded' : ''}`.trim()}>
      <span className="image-skeleton" aria-hidden="true" />
      <img
        src={imageSrc}
        srcSet={hasError ? undefined : optimizedImage.srcSet}
        sizes={sizes}
        alt={alt}
        className={className}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true)
          setIsLoaded(true)
        }}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
      />
    </span>
  )
}

export default ImageWithFallback
