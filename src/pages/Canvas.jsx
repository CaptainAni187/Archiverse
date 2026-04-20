import { useEffect, useState } from 'react'
import ArtworkCarousel from '../components/ArtworkCarousel'
import { fetchArtworks } from '../services/artworkService'
import { getCanvasArtworks } from '../utils/artworkCategories'
import usePageMeta from '../hooks/usePageMeta'

function Canvas() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  usePageMeta({
    title: 'CANVAS | ARCHIVERSE',
    description: 'Explore acrylic and painted works from ARCHIVERSE.',
  })

  useEffect(() => {
    async function loadArtworks() {
      try {
        const response = await fetchArtworks()
        setArtworks(getCanvasArtworks(response))
      } catch (error) {
        setErrorMessage(`Could not load CANVAS works: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadArtworks()
  }, [])

  const canvasImages = artworks.map((artwork) => ({
    src: artwork.images?.[0] || artwork.image,
    title: artwork.title,
    medium: artwork.medium,
    year: artwork.year,
  }))

  return (
    <section className="page-flow fullscreen-page">
      {loading ? <p className="status-message">Loading CANVAS works...</p> : null}
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
      {!loading && !errorMessage && artworks.length === 0 ? (
        <p className="status-message">No CANVAS works available yet.</p>
      ) : null}

      {!loading && !errorMessage && artworks.length > 0 ? (
        <ArtworkCarousel images={canvasImages} interval={5000} overlayPosition="left" />
      ) : null}
    </section>
  )
}

export default Canvas
