import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchArtworks } from '../services/artworkService'
import ArtworkCard from '../components/ArtworkCard'
import usePageMeta from '../hooks/usePageMeta'

function Home() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  usePageMeta({
    title: 'Archiverse | Curated Fine Art',
    description:
      'Discover original fine art, pay 50% advance, and collect timeless works from Archiverse.',
  })

  useEffect(() => {
    async function loadFeatured() {
      try {
        const artworks = await fetchArtworks()
        setFeatured(artworks.slice(0, 3))
      } catch (error) {
        setErrorMessage(`Could not load featured artworks: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadFeatured()
  }, [])

  return (
    <section className="home-stack">
      <article className="hero-card">
        <p className="brand-kicker">Premium Collection</p>
        <h2 className="section-title">Collect Art That Holds Presence</h2>
        <p>
          Archiverse curates paintings and visual works for homes, studios, and
          collectors who value character and craft.
        </p>
        <div className="btn-row">
          <Link to="/gallery" className="link-button">
            Explore Gallery
          </Link>
          <Link to="/policies" className="link-button secondary-link">
            View Policies
          </Link>
        </div>
      </article>

      <div>
        <h3 className="section-title">Featured Artworks</h3>
        {loading ? <p className="status-message">Loading featured artworks...</p> : null}
        {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
        {!loading && !errorMessage && featured.length === 0 ? (
          <p className="status-message">No featured artworks found.</p>
        ) : null}
        <div className="grid">
          {featured.map((artwork) => (
            <ArtworkCard key={artwork.id} artwork={artwork} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Home
