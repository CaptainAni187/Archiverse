import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import ImageWithFallback from './ImageWithFallback'

function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString()}`
}

function ArtworkCard({ artwork }) {
  const navigate = useNavigate()

  return (
    <article
      className="card"
      onClick={() => navigate(`/product/${artwork.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          navigate(`/product/${artwork.id}`)
        }
      }}
    >
      <div className="card-media">
        <ImageWithFallback
          src={artwork.images?.[0] || artwork.image}
          alt={artwork.title}
          className="card-image"
        />
        {artwork.status === 'sold' ? <span className="badge sold">Sold Out</span> : null}
      </div>
      <div className="card-body">
        <h3>{artwork.title}</h3>
        <p>{formatPrice(artwork.price)}</p>
      </div>
    </article>
  )
}

export default memo(ArtworkCard)
