import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString()}`
}

function StoreCard({ artwork }) {
  const navigate = useNavigate()
  const images = useMemo(() => artwork.images || [], [artwork.id, artwork.images])
  const primaryImage = images[0]

  return (
    <article
      className="store-card"
      onClick={() => navigate(`/product/${artwork.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          navigate(`/product/${artwork.id}`)
        }
      }}
    >
      <div className="store-card-media">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={artwork.title}
            className="store-card-image"
            loading="lazy"
            decoding="async"
            width="960"
            height="1200"
          />
        ) : null}
        {artwork.status === 'sold' ? (
          <span className="badge sold card-badge">SOLD OUT</span>
        ) : null}
      </div>
      <div className="store-card-body">
        <h3>{artwork.title}</h3>
        <p>{formatPrice(artwork.price)}</p>
      </div>
    </article>
  )
}

export default StoreCard
