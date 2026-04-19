import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useOrderContext } from '../state/useOrderContext'
import { fetchSingleArtwork } from '../services/artworkService'
import ImageWithFallback from '../components/ImageWithFallback'
import usePageMeta from '../hooks/usePageMeta'

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

  usePageMeta({
    title: artwork ? `${artwork.title} | Archiverse` : 'Artwork | Archiverse',
    description:
      artwork?.description || 'Explore artwork details and pay 50% advance at Archiverse.',
  })

  useEffect(() => {
    async function loadArtwork() {
      try {
        const response = await fetchSingleArtwork(id)
        setArtwork(response || null)
        setActiveImage(response?.images?.[0] || response?.image || '')
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(`Could not load artwork: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadArtwork()
  }, [id])

  if (loading) {
    return <p className="status-message">Loading artwork...</p>
  }

  if (errorMessage) {
    return <p className="status-message error">{errorMessage}</p>
  }

  if (!artwork) {
    return <p className="status-message">Artwork not found.</p>
  }

  const buyNow = () => {
    if (artwork.status === 'sold') {
      return
    }

    setSelectedProduct(artwork)
    navigate('/checkout', { state: { product: artwork } })
  }

  return (
    <section className="product-layout">
      <div>
        <div className="product-image-wrap">
          <ImageWithFallback
            src={activeImage || artwork.images?.[0] || artwork.image}
            alt={artwork.title}
            className="product-image"
          />
          {artwork.status === 'sold' ? (
            <span className="badge sold product-badge">Sold Out</span>
          ) : null}
        </div>
        <div className="thumbnail-row">
          {(artwork.images || []).map((imageUrl) => (
            <button
              key={imageUrl}
              type="button"
              className={`thumbnail-btn ${activeImage === imageUrl ? 'active' : ''}`}
              onClick={() => setActiveImage(imageUrl)}
            >
              <ImageWithFallback
                src={imageUrl}
                alt={`${artwork.title} view`}
                className="thumbnail-image"
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="section-title">{artwork.title}</h2>
        <p className="price">{formatPrice(artwork.price)}</p>
        <p>
          <strong>Medium:</strong> {artwork.medium}
        </p>
        <p>
          <strong>Size:</strong> {artwork.size}
        </p>
        <p>{artwork.description}</p>
        <button type="button" onClick={buyNow} disabled={artwork.status === 'sold'}>
          {artwork.status === 'sold' ? 'Sold Out' : 'Buy Now'}
        </button>
      </div>
    </section>
  )
}

export default Product
