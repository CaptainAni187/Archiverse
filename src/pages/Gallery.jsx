import { useEffect, useState } from 'react'
import { fetchArtworks } from '../services/artworkService'
import Reveal from '../components/Reveal'
import StoreCard from '../components/StoreCard'
import usePageMeta from '../hooks/usePageMeta'

function Gallery() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  usePageMeta({
    title: 'Gallery | Archiverse',
    description: 'Browse curated artworks available at Archiverse.',
  })

  useEffect(() => {
    async function loadArtworks() {
      try {
        const response = await fetchArtworks()
        setArtworks(response)
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(`Could not load artworks: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadArtworks()
  }, [])

  if (loading) {
    return <p className="status-message">Loading gallery...</p>
  }

  if (errorMessage) {
    return <p className="status-message error">{errorMessage}</p>
  }

  if (artworks.length === 0) {
    return <p className="status-message">No artworks found.</p>
  }

  return (
    <section className="page-flow page-with-header-gap">
      <Reveal className="portfolio-header">
        <p className="eyebrow">STORE</p>
        <p className="store-tagline">ORIGINAL WORKS AVAILABLE FOR COLLECTION.</p>
      </Reveal>
      <div className="store-grid">
        {artworks.map((artwork) => (
          <StoreCard key={artwork.id} artwork={artwork} />
        ))}
      </div>
    </section>
  )
}

export default Gallery
