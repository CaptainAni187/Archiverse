import { useEffect, useState } from 'react'
import ArtworkCard from '../components/ArtworkCard'
import { fetchArtworks } from '../services/artworkService'
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
    <section>
      <h2 className="section-title">Gallery</h2>
      <div className="grid">
        {artworks.map((artwork) => (
          <ArtworkCard key={artwork.id} artwork={artwork} />
        ))}
      </div>
    </section>
  )
}

export default Gallery
