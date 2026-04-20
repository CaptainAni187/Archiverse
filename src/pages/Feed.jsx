import { useEffect, useState } from 'react'
import Reveal from '../components/Reveal'
import ImageWithFallback from '../components/ImageWithFallback'
import { fetchArtworks } from '../services/artworkService'
import usePageMeta from '../hooks/usePageMeta'

function Feed() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  usePageMeta({
    title: 'FEED | ARCHIVERSE',
    description: 'Selected recent works and highlights from ARCHIVERSE.',
  })

  useEffect(() => {
    async function loadFeed() {
      try {
        const response = await fetchArtworks()
        setArtworks(response.slice(0, 6))
      } catch (error) {
        setErrorMessage(`Could not load the FEED: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadFeed()
  }, [])

  return (
    <section className="page-flow page-with-header-gap">
      <p className="eyebrow">FEED</p>

      {loading ? <p className="status-message">Loading FEED…</p> : null}
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}

      {artworks[0] ? (
        <Reveal className="feed-feature">
          <ImageWithFallback
            src={artworks[0].images?.[0] || artworks[0].image}
            alt={artworks[0].title}
            className="feed-feature-image"
          />
        </Reveal>
      ) : null}

      <div className="feed-masonry">
        {artworks.slice(1).map((artwork, index) => (
          <Reveal key={artwork.id} className={`feed-brick feed-brick-${(index % 4) + 1}`}>
            <ImageWithFallback
              src={artwork.images?.[0] || artwork.image}
              alt={artwork.title}
              className="feed-image"
            />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default Feed
