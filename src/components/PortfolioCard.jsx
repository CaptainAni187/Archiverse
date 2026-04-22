import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

function PortfolioCard({ artwork }) {
  const navigate = useNavigate()
  const images = useMemo(() => artwork.images || [], [artwork.id, artwork.images])
  const primaryImage = images[0]

  return (
    <article
      className="portfolio-card"
      onClick={() => navigate(`/product/${artwork.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          navigate(`/product/${artwork.id}`)
        }
      }}
    >
      <div className="portfolio-image-wrap">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={artwork.title}
            className="portfolio-image"
            loading="lazy"
            decoding="async"
            width="960"
            height="1200"
          />
        ) : null}
      </div>
      <div className="portfolio-meta">
        <h3>{artwork.title}</h3>
        <p>{artwork.medium}</p>
      </div>
    </article>
  )
}

export default PortfolioCard
