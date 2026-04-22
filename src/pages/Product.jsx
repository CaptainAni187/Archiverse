import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useOrderContext } from '../state/useOrderContext'
import { fetchSingleArtwork } from '../services/artworkService'
import { trackAnalyticsEvent } from '../services/analyticsService'
import Reveal from '../components/Reveal'
import ErrorState from '../components/ErrorState'
import { SkeletonProduct } from '../components/SkeletonLoader'
import usePageMeta from '../hooks/usePageMeta'
import { getUserFriendlyError } from '../utils/userErrors'

function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString()}`
}

function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setSelectedProduct } = useOrderContext()
  const [artwork, setArtwork] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeImage, setActiveImage] = useState('')
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const [isImageHovering, setIsImageHovering] = useState(false)
  const [hoverZoomOrigin, setHoverZoomOrigin] = useState({ x: '50%', y: '50%' })
  const [retryKey, setRetryKey] = useState(0)

  usePageMeta({
    title: artwork ? `${artwork.title} | Archiverse` : 'Artwork | Archiverse',
    description:
      artwork?.description || 'Explore artwork details and pay 50% advance at Archiverse.',
  })

  useEffect(() => {
    async function loadArtwork() {
      setLoading(true)
      try {
        const response = await fetchSingleArtwork(id)
        setArtwork(response || null)
        setActiveImage(Array.isArray(response?.images) ? response.images[0] || '' : '')
        if (response) {
          void trackAnalyticsEvent('artwork_view', {
            artwork_id: response.id,
            title: response.title,
            category: response.category || null,
          })
        }
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(
          getUserFriendlyError(error, 'We could not load this artwork right now.'),
        )
      } finally {
        setLoading(false)
      }
    }

    loadArtwork()
  }, [id, retryKey])

  const galleryImages = Array.isArray(artwork?.images)
    ? artwork.images
    : artwork?.image
      ? [artwork.image]
      : []
  const primaryImage = galleryImages[0] || ''
  const currentImage = activeImage || primaryImage
  const activeImageIndex = galleryImages.indexOf(currentImage)
  const safeImageIndex = activeImageIndex >= 0 ? activeImageIndex : 0

  const goToPreviousImage = () => {
    if (galleryImages.length <= 1) {
      return
    }

    const nextIndex = safeImageIndex === 0 ? galleryImages.length - 1 : safeImageIndex - 1
    setActiveImage(galleryImages[nextIndex])
  }

  const goToNextImage = () => {
    if (galleryImages.length <= 1) {
      return
    }

    const nextIndex = safeImageIndex === galleryImages.length - 1 ? 0 : safeImageIndex + 1
    setActiveImage(galleryImages[nextIndex])
  }

  const handleImageMouseMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * 100
    const relativeY = ((event.clientY - bounds.top) / bounds.height) * 100

    setHoverZoomOrigin({
      x: `${Math.min(100, Math.max(0, relativeX))}%`,
      y: `${Math.min(100, Math.max(0, relativeY))}%`,
    })
  }

  useEffect(() => {
    if (!isZoomOpen) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsZoomOpen(false)
      }
      if (galleryImages.length > 1 && event.key === 'ArrowLeft') {
        event.preventDefault()
        setActiveImage((previous) => {
          const currentIndex = galleryImages.indexOf(previous)
          const resolvedIndex = currentIndex >= 0 ? currentIndex : 0
          const nextIndex = resolvedIndex === 0 ? galleryImages.length - 1 : resolvedIndex - 1
          return galleryImages[nextIndex]
        })
      }
      if (galleryImages.length > 1 && event.key === 'ArrowRight') {
        event.preventDefault()
        setActiveImage((previous) => {
          const currentIndex = galleryImages.indexOf(previous)
          const resolvedIndex = currentIndex >= 0 ? currentIndex : 0
          const nextIndex = resolvedIndex === galleryImages.length - 1 ? 0 : resolvedIndex + 1
          return galleryImages[nextIndex]
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [galleryImages, isZoomOpen])

  if (loading) {
    return (
      <section className="page-flow page-with-header-gap">
        <SkeletonProduct />
      </section>
    )
  }

  if (errorMessage) {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={() => setRetryKey((value) => value + 1)}
      />
    )
  }

  if (!artwork) {
    return <p className="status-message">Artwork not found.</p>
  }

  const buyNow = () => {
    if (artwork.status === 'sold' || Number(artwork.quantity) <= 0) {
      return
    }

    setSelectedProduct(artwork)
    navigate('/checkout', { state: { product: artwork } })
  }
  const isSoldOut = artwork.status === 'sold' || Number(artwork.quantity) <= 0

  return (
    <section className="page-flow page-with-header-gap">
      <Reveal className="product-layout">
        <div className="product-gallery">
          <div className="product-image-wrap">
            <button
              type="button"
              className={`product-zoom-trigger ${isImageHovering ? 'is-hovering' : ''}`}
              onClick={() => setIsZoomOpen(true)}
              onMouseEnter={() => setIsImageHovering(true)}
              onMouseLeave={() => setIsImageHovering(false)}
              onMouseMove={handleImageMouseMove}
              aria-label={`Open full resolution view of ${artwork.title}`}
            >
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={artwork.title}
                  className="product-image"
                  style={{
                    '--product-zoom-origin-x': hoverZoomOrigin.x,
                    '--product-zoom-origin-y': hoverZoomOrigin.y,
                  }}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  width="1400"
                  height="1750"
                />
              ) : null}
            </button>
            {galleryImages.length > 1 ? (
              <>
                <button
                  type="button"
                  className="artwork-carousel__arrow artwork-carousel__arrow--left product-gallery-arrow"
                  onClick={goToPreviousImage}
                  aria-label="Previous artwork image"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="artwork-carousel__arrow artwork-carousel__arrow--right product-gallery-arrow"
                  onClick={goToNextImage}
                  aria-label="Next artwork image"
                >
                  →
                </button>
              </>
            ) : null}
            {isSoldOut ? (
              <span className="badge sold product-badge">Sold Out</span>
            ) : null}
          </div>
          <div className="thumbnail-row">
            {galleryImages.map((image, index) =>
              image ? (
                <button
                  key={`${artwork.id}-${index}`}
                  type="button"
                  className={`thumbnail-btn ${activeImage === image ? 'active' : ''}`}
                  onClick={() => setActiveImage(image)}
                >
                  <img
                    src={image}
                    alt={`${artwork.title} view ${index + 1}`}
                    className="thumbnail-image"
                    loading="lazy"
                    decoding="async"
                    width="240"
                    height="240"
                  />
                </button>
              ) : null,
            )}
          </div>
        </div>
        <div className="product-copy">
          <p className="eyebrow">ORIGINAL ARTWORK</p>
          <h1 className="section-title">{artwork.title}</h1>
          <p className="price">{formatPrice(artwork.price)}</p>
          <div className="product-meta">
            <p>
              <span>Medium</span>
              {artwork.medium}
            </p>
            <p>
              <span>Size</span>
              {artwork.size}
            </p>
          </div>
          <p>ONLY 1 PIECE AVAILABLE</p>
          <p>SHIPS IN 7–10 DAYS</p>
          <p className="product-description">{artwork.description}</p>
          <button
            type="button"
            className="text-link-button action-button"
            onClick={buyNow}
            disabled={isSoldOut}
          >
            {isSoldOut ? 'Sold Out' : 'Buy This Work'}
          </button>
        </div>
      </Reveal>
      {isZoomOpen ? (
        <div
          className="image-zoom-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${artwork.title} full resolution image`}
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            type="button"
            className="image-zoom-close"
            onClick={() => setIsZoomOpen(false)}
          >
            Close
          </button>
          {galleryImages.length > 1 ? (
            <>
              <button
                type="button"
                className="artwork-carousel__arrow artwork-carousel__arrow--left image-zoom-arrow"
                onClick={(event) => {
                  event.stopPropagation()
                  goToPreviousImage()
                }}
                aria-label="Previous artwork image"
              >
                ←
              </button>
              <button
                type="button"
                className="artwork-carousel__arrow artwork-carousel__arrow--right image-zoom-arrow"
                onClick={(event) => {
                  event.stopPropagation()
                  goToNextImage()
                }}
                aria-label="Next artwork image"
              >
                →
              </button>
            </>
          ) : null}
          <img
            src={currentImage}
            alt={artwork.title}
            className="image-zoom-full"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  )
}

export default Product
