import { useState } from 'react'

const fallbackSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' fill='%236b7280' font-size='28' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif'%3EImage unavailable%3C/text%3E%3C/svg%3E"

function ImageWithFallback({ src, alt, className, loading = 'lazy', fetchPriority }) {
  const [hasError, setHasError] = useState(false)
  const optimizedSrc =
    typeof src === 'string' && src.includes('images.unsplash.com')
      ? `${src}${src.includes('?') ? '&' : '?'}auto=format&fit=crop&q=80&w=1400`
      : src
  const imageSrc = hasError || !optimizedSrc ? fallbackSvg : optimizedSrc

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading={loading}
      fetchPriority={fetchPriority}
    />
  )
}

export default ImageWithFallback
