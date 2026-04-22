import { useEffect, useMemo, useState } from 'react'
import Reveal from '../components/Reveal'
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
        setArtworks(response)
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

  const featureImage = useMemo(
    () => (Array.isArray(artworks[0]?.images) ? artworks[0].images[0] || '' : ''),
    [artworks],
  )
  const masonryItems = useMemo(
    () =>
      artworks.slice(1).map((artwork) => ({
        ...artwork,
        src: Array.isArray(artwork.images) ? artwork.images[0] || '' : '',
      })),
    [artworks],
  )

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
          {featureImage ? (
            <img
              src={featureImage}
              alt={artworks[0].title}
              className="feed-feature-image"
              loading="lazy"
              decoding="async"
              width="1600"
              height="1200"
            />
          ) : null}
        </Reveal>
      ) : null}

      <div className="feed-masonry">
        {masonryItems.map((artwork, index) => (
          <Reveal key={artwork.id} className={`feed-brick feed-brick-${(index % 4) + 1}`}>
            {artwork.src ? (
              <img
                src={artwork.src}
                alt={artwork.title}
                className="feed-image"
                loading="lazy"
                decoding="async"
                width="900"
                height="1200"
              />
            ) : null}
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default Feed
