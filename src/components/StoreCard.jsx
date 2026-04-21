import { useNavigate } from 'react-router-dom'
import ImageWithFallback from './ImageWithFallback'

function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString()}`
}

function StoreCard({ artwork }) {
  const navigate = useNavigate()

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
        <ImageWithFallback
          src={artwork.image}
          alt={artwork.title}
          className="store-card-image"
          sizes="(max-width: 720px) 100vw, (max-width: 980px) 50vw, 33vw"
          maxWidth={960}
        />
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
