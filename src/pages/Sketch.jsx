import { useEffect, useState } from 'react'
import ArtworkCarousel from '../components/ArtworkCarousel'
import { fetchArtworks } from '../services/artworkService'
import { getSketchArtworks } from '../utils/artworkCategories'
import usePageMeta from '../hooks/usePageMeta'

const placeholderSketch = {
  id: 'placeholder-sketch-1',
  title: 'FIGURE STUDY',
  medium: 'GRAPHITE ON PAPER',
  image:
    'https://images.unsplash.com/photo-1517971129774-8a2b38fa128e?auto=format&fit=crop&w=1600&q=80',
  images: [
    'https://images.unsplash.com/photo-1517971129774-8a2b38fa128e?auto=format&fit=crop&w=1600&q=80',
  ],
  category: 'sketch',
}

function Sketch() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  usePageMeta({
    title: 'SKETCH | ARCHIVERSE',
    description: 'Explore sketch studies and drawing works from ARCHIVERSE.',
  })

  useEffect(() => {
    async function loadArtworks() {
      try {
        const response = await fetchArtworks()
        const sketchWorks = getSketchArtworks(response)
        setArtworks(sketchWorks.length > 0 ? sketchWorks : [placeholderSketch])
      } catch (error) {
        setErrorMessage(`Could not load SKETCH works: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadArtworks()
  }, [])

  const sketchImages = artworks.map((artwork) => ({
    src: artwork.images?.[0] || artwork.image,
    title: artwork.title,
    medium: artwork.medium,
  }))

  return (
    <section className="page-flow fullscreen-page">
      {loading ? <p className="status-message">Loading SKETCH works...</p> : null}
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
      {!loading && !errorMessage && artworks.length === 0 ? (
        <p className="status-message">No SKETCH works available yet.</p>
      ) : null}

      {!loading && !errorMessage && artworks.length > 0 ? (
        <ArtworkCarousel images={sketchImages} interval={5000} overlayPosition="left" />
      ) : null}
    </section>
  )
}

export default Sketch
