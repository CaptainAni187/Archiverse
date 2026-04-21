import { useEffect, useState } from 'react'
import Reveal from '../components/Reveal'
import ImageWithFallback from '../components/ImageWithFallback'
import { fetchArtworks } from '../services/artworkService'
import usePageMeta from '../hooks/usePageMeta'
import ErrorState from '../components/ErrorState'
import { SkeletonMasonry } from '../components/SkeletonLoader'
import { getUserFriendlyError } from '../utils/userErrors'

function Feed() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  usePageMeta({
    title: 'FEED | ARCHIVERSE',
    description: 'Selected recent works and highlights from ARCHIVERSE.',
  })

  useEffect(() => {
    async function loadFeed() {
      setLoading(true)
      try {
        const response = await fetchArtworks()
        setArtworks(response.slice(0, 6))
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(
          getUserFriendlyError(error, 'We could not load the feed right now.'),
        )
      } finally {
        setLoading(false)
      }
    }

    loadFeed()
  }, [retryKey])

  return (
    <section className="page-flow page-with-header-gap">
      <p className="eyebrow">FEED</p>

      {loading ? (
        <>
          <div className="skeleton-block feed-feature-image" aria-hidden="true" />
          <SkeletonMasonry />
        </>
      ) : null}
      {errorMessage ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => setRetryKey((value) => value + 1)}
        />
      ) : null}

      {artworks[0] ? (
        <Reveal className="feed-feature">
          <ImageWithFallback
            src={artworks[0].image}
            alt={artworks[0].title}
            className="feed-feature-image"
            sizes="100vw"
            maxWidth={1600}
          />
        </Reveal>
      ) : null}

      <div className="feed-masonry">
        {artworks.slice(1).map((artwork, index) => (
          <Reveal key={artwork.id} className={`feed-brick feed-brick-${(index % 4) + 1}`}>
            <ImageWithFallback
              src={artwork.image}
              alt={artwork.title}
              className="feed-image"
              sizes="(max-width: 720px) 100vw, (max-width: 980px) 50vw, 33vw"
              maxWidth={900}
            />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default Feed
