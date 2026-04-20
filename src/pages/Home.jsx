import { useEffect, useState } from 'react'
import { fetchArtworks } from '../services/artworkService'
import FullscreenCarousel from '../components/FullscreenCarousel'
import PortfolioCard from '../components/PortfolioCard'
import ImageWithFallback from '../components/ImageWithFallback'
import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta'
import { getCanvasArtworks, getSketchArtworks } from '../utils/artworkCategories'

function Home() {
  const [canvasWorks, setCanvasWorks] = useState([])
  const [sketchWorks, setSketchWorks] = useState([])
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
        setCanvasWorks(getCanvasArtworks(artworks).slice(0, 4))
        setSketchWorks(getSketchArtworks(artworks).slice(0, 2))
      } catch (error) {
        setErrorMessage(`Could not load featured artworks: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadFeatured()
  }, [])

  return (
    <section className="page-flow">
      {loading ? <p className="status-message">Loading artworks...</p> : null}
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
      {!loading && !errorMessage ? (
        <>
          <FullscreenCarousel
            artworks={[...canvasWorks, ...sketchWorks]}
            autoSlide
            interval={5000}
            showMeta={false}
            overlayContent={() => (
              <div className="hero-overlay-copy">
                <p>CURATED WORKS</p>
                <h1>ARCHIVERSE</h1>
                <p>
                  SELECTED PAINTINGS, SKETCHES, AND STUDIES PRESENTED WITH QUIET
                  PRECISION
                </p>
                <Link to="/canvas" className="hero-enter-link">
                  ENTER CANVAS
                </Link>
              </div>
            )}
          />

          <section className="section-block">
            <p className="eyebrow">FEATURED WORKS</p>
            <div className="portfolio-grid">
              {canvasWorks.slice(0, 6).map((artwork) => (
                <PortfolioCard key={artwork.id} artwork={artwork} />
              ))}
            </div>
          </section>

          <section className="section-block">
            <p className="eyebrow">ABOUT</p>
            <p className="section-copy">
              ARCHIVERSE PRESENTS ORIGINAL WORKS WITH A QUIET, IMAGE-FIRST
              STRUCTURE FOR COLLECTORS AND CURIOUS VIEWERS.
            </p>
          </section>

          <section className="section-block process-grid">
            <div>
              <p className="eyebrow">STEP 01</p>
              <p className="section-copy">DISCOVER A WORK</p>
            </div>
            <div>
              <p className="eyebrow">STEP 02</p>
              <p className="section-copy">RESERVE WITH 50% ADVANCE</p>
            </div>
            <div>
              <p className="eyebrow">STEP 03</p>
              <p className="section-copy">CONFIRMATION AND PREP</p>
            </div>
            <div>
              <p className="eyebrow">STEP 04</p>
              <p className="section-copy">DELIVERY AND FINAL PAYMENT</p>
            </div>
          </section>

          <section className="section-block">
            <p className="eyebrow">FEED PREVIEW</p>
            <div className="feed-preview-grid">
              {[...canvasWorks, ...sketchWorks]
                .slice(0, 6)
                .map((artwork) => (
                  <ImageWithFallback
                    key={artwork.id}
                    src={artwork.images?.[0] || artwork.image}
                    alt={artwork.title}
                    className="feed-preview-image"
                  />
                ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  )
}

export default Home
