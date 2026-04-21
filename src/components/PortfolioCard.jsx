import { useNavigate } from 'react-router-dom'
import ImageWithFallback from './ImageWithFallback'

function PortfolioCard({ artwork }) {
  const navigate = useNavigate()

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
        <ImageWithFallback
          src={artwork.image}
          alt={artwork.title}
          className="portfolio-image"
          sizes="(max-width: 720px) 100vw, (max-width: 980px) 50vw, 33vw"
          maxWidth={960}
        />
      </div>
      <div className="portfolio-meta">
        <h3>{artwork.title}</h3>
        <p>{artwork.medium}</p>
      </div>
    </article>
  )
}

export default PortfolioCard
