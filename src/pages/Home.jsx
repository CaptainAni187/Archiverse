import { useEffect, useMemo, useState } from 'react'
import { fetchArtworks } from '../services/artworkService'
import { fetchTestimonials } from '../services/testimonialService'
import FullscreenCarousel from '../components/FullscreenCarousel'
import PortfolioCard from '../components/PortfolioCard'
import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta'
import { getCanvasArtworks, getSketchArtworks } from '../utils/artworkCategories'
import ErrorState from '../components/ErrorState'
import { SkeletonGrid } from '../components/SkeletonLoader'
import { getUserFriendlyError } from '../utils/userErrors'

function Home() {
  const [heroCanvasWorks, setHeroCanvasWorks] = useState([])
  const [heroSketchWorks, setHeroSketchWorks] = useState([])
  const [canvasWorks, setCanvasWorks] = useState([])
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

        const featuredWorks = artworks
          .filter((artwork) => artwork.is_featured === true)
          .slice(0, 6)

        setHeroCanvasWorks(getCanvasArtworks(artworks).slice(0, 4))
        setHeroSketchWorks(getSketchArtworks(artworks).slice(0, 2))
        setCanvasWorks(featuredWorks)
        setTestimonials(reviewResponse.slice(0, 3))
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

  const heroArtworks = useMemo(
    () => [...heroCanvasWorks, ...heroSketchWorks],
    [heroCanvasWorks, heroSketchWorks],
  )

  return (
    <section className="page-flow">
      {loading ? (
        <>
          <div className="carousel-stage full-bleed" aria-hidden="true">
            <div className="carousel-placeholder skeleton-block" />
          </div>
          <section className="section-block">
            <p className="eyebrow">FEATURED WORKS</p>
            <SkeletonGrid className="portfolio-grid" count={6} />
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
            artworks={heroArtworks}
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
              {canvasWorks.map((artwork) => (
                <PortfolioCard key={artwork.id} artwork={artwork} />
              ))}
            </div>
          </section>

          <section className="section-block">
            <p className="eyebrow">ABOUT</p>
            <p className="section-copy">
              HANDMADE ACRYLIC ARTWORKS
            </p>
            <p className="section-copy">
              MINIMAL • MODERN • PERSONAL
            </p>
            <p className="section-copy">
              EACH PIECE IS CREATED WITH DETAIL,
              DESIGNED TO FIT YOUR SPACE AND STYLE.
            </p>
          </section>

          <section className="section-block">
            <p className="eyebrow">CUSTOM ARTWORKS</p>
            <p className="section-copy">
              REQUEST A PERSONALIZED PAINTING
              BASED ON YOUR IDEA, STYLE, AND SPACE.
            </p>
            <Link to="/contact" className="text-link-button">
              CONTACT
            </Link>
          </section>

          {testimonials.length > 0 ? (
            <section className="section-block">
              <p className="eyebrow">TESTIMONIALS</p>
              <div className="testimonial-grid">
                {testimonials.map((testimonial) => (
                  <article key={testimonial.id} className="testimonial-card">
                    {testimonial.rating ? (
                      <p className="testimonial-rating">{'*'.repeat(testimonial.rating)}</p>
                    ) : null}
                    <p className="section-copy">"{testimonial.content}"</p>
                    <p>
                      <strong>{testimonial.name.toUpperCase()}</strong>
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="section-block">
            <p className="eyebrow">EXPLORE FULL GALLERY</p>
            <Link to="/feed" className="text-link-button">
              VIEW GALLERY
            </Link>
          </section>
        </>
      ) : null}
    </section>
  )
}

export default Home
