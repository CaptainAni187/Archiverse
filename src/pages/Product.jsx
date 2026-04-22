import { useEffect, useMemo, useState } from 'react'
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

  useEffect(() => {
    if (!isZoomOpen) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsZoomOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isZoomOpen])

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
  const galleryImages = useMemo(() => artwork.images || [], [artwork.id, artwork.images])
  const primaryImage = galleryImages[0] || ''

  return (
    <section className="page-flow page-with-header-gap">
      <Reveal className="product-layout">
        <div className="product-gallery">
          <div className="product-image-wrap">
            <button
              type="button"
              className="product-zoom-trigger"
              onClick={() => setIsZoomOpen(true)}
              aria-label={`Open full resolution view of ${artwork.title}`}
            >
              {activeImage || primaryImage ? (
                <img
                  src={activeImage || primaryImage}
                  alt={artwork.title}
                  className="product-image"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  width="1400"
                  height="1750"
                />
              ) : null}
            </button>
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
          <img
            src={activeImage || primaryImage}
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
