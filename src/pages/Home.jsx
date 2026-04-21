import { useEffect, useState } from 'react'
import { fetchArtworks } from '../services/artworkService'
import { fetchTestimonials } from '../services/testimonialService'
import FullscreenCarousel from '../components/FullscreenCarousel'
import PortfolioCard from '../components/PortfolioCard'
import ImageWithFallback from '../components/ImageWithFallback'
import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta'
import { getCanvasArtworks, getSketchArtworks } from '../utils/artworkCategories'
import ErrorState from '../components/ErrorState'
import { SkeletonGrid } from '../components/SkeletonLoader'
import { getUserFriendlyError } from '../utils/userErrors'

function Home() {
  const [canvasWorks, setCanvasWorks] = useState([])
  const [sketchWorks, setSketchWorks] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  usePageMeta({
    title: 'Archiverse | Curated Fine Art',
    description:
      'Discover original fine art, pay 50% advance, and collect timeless works from Archiverse.',
  })

  useEffect(() => {
    async function loadFeatured() {
      setLoading(true)
      setNoticeMessage('')
      try {
        const artworks = await fetchArtworks()
        let reviewResponse = []

        try {
          reviewResponse = await fetchTestimonials()
        } catch (error) {
          setNoticeMessage(
            getUserFriendlyError(error, 'Reviews are unavailable right now.'),
          )
        }

        setCanvasWorks(getCanvasArtworks(artworks).slice(0, 4))
        setSketchWorks(getSketchArtworks(artworks).slice(0, 2))
        setTestimonials(reviewResponse)
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(
          getUserFriendlyError(error, 'We could not load the home page right now.'),
        )
      } finally {
        setLoading(false)
      }
    }

    loadFeatured()
  }, [retryKey])

  return (
    <section className="page-flow">
      {loading ? (
        <>
          <div className="carousel-stage full-bleed" aria-hidden="true">
            <div className="carousel-placeholder skeleton-block" />
          </div>
          <section className="section-block">
            <p className="eyebrow">FEATURED WORKS</p>
            <SkeletonGrid className="portfolio-grid" count={4} />
          </section>
        </>
      ) : null}
      {errorMessage ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => setRetryKey((value) => value + 1)}
        />
      ) : null}
      {noticeMessage && !errorMessage ? <p className="status-message">{noticeMessage}</p> : null}
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

          {testimonials.length > 0 ? (
            <section className="section-block">
              <p className="eyebrow">REVIEWS</p>
              <div className="testimonial-grid">
                {testimonials.map((testimonial) => (
                  <article key={testimonial.id} className="testimonial-card">
                    <p className="testimonial-rating">
                      {'*'.repeat(testimonial.rating)}
                    </p>
                    <p className="section-copy">"{testimonial.review_text}"</p>
                    <p>
                      <strong>{testimonial.customer_name}</strong>
                      {testimonial.location ? ` / ${testimonial.location}` : ''}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

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
                    src={artwork.image}
                    alt={artwork.title}
                    className="feed-preview-image"
                    sizes="(max-width: 720px) 50vw, 33vw"
                    maxWidth={720}
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
