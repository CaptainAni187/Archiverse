import { useEffect, useMemo, useState } from 'react'
import { fetchArtworks } from '../services/artworkService'
import { fetchTestimonials } from '../services/testimonialService'
import FullscreenCarousel from '../components/FullscreenCarousel'
import PortfolioCard from '../components/PortfolioCard'
import { Link, useNavigate } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta'
import { getCanvasArtworks, getSketchArtworks } from '../utils/artworkCategories'
import ErrorState from '../components/ErrorState'
import { SkeletonGrid } from '../components/SkeletonLoader'
import { getUserFriendlyError } from '../utils/userErrors'

const processSteps = [
  {
    step: 'Step 01',
    copy: 'Browse featured works and select the piece that fits your space.',
  },
  {
    step: 'Step 02',
    copy: 'Review details, pricing, and delivery timing before checkout.',
  },
  {
    step: 'Step 03',
    copy: 'Pay the advance securely and confirm your collector details.',
  },
  {
    step: 'Step 04',
    copy: 'Track the order through preparation, shipping, and delivery.',
  },
]

function pickStableGalleryPreview(artworks) {
  const validArtworks = artworks.filter((artwork) =>
    Array.isArray(artwork.images) && typeof artwork.images[0] === 'string' && artwork.images[0].trim(),
  )

  if (validArtworks.length <= 3) {
    return validArtworks.slice(0, 3)
  }

  const pool = [...validArtworks]
  const selected = []

  while (selected.length < 3 && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length)
    selected.push(pool.splice(index, 1)[0])
  }

  return selected
}

function Home() {
  const navigate = useNavigate()
  const [heroCanvasWorks, setHeroCanvasWorks] = useState([])
  const [heroSketchWorks, setHeroSketchWorks] = useState([])
  const [canvasWorks, setCanvasWorks] = useState([])
  const [galleryPreviewWorks, setGalleryPreviewWorks] = useState([])
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

        const featuredWorks = artworks.filter((artwork) => artwork.is_featured === true)
        const curatedHeroCanvas = getCanvasArtworks(featuredWorks).slice(0, 4)
        const curatedHeroSketch = getSketchArtworks(featuredWorks).slice(0, 2)

        if (featuredWorks.length === 0) {
          setNoticeMessage('Featured works are being curated right now.')
        }

        setHeroCanvasWorks(curatedHeroCanvas)
        setHeroSketchWorks(curatedHeroSketch)
        setCanvasWorks(featuredWorks.slice(0, 6))
        setGalleryPreviewWorks((current) =>
          current.length > 0 ? current : pickStableGalleryPreview(artworks),
        )
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
  const galleryPreviewItems = useMemo(
    () =>
      galleryPreviewWorks.map((artwork) => ({
        id: artwork.id,
        src: artwork.images[0],
        title: artwork.title,
      })),
    [galleryPreviewWorks],
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

          <section className="section-block section-block-home">
            <p className="eyebrow">PROCESS</p>
            <div className="process-grid">
              {processSteps.map((item) => (
                <article key={item.step} className="testimonial-card">
                  <p className="eyebrow">{item.step}</p>
                  <p className="section-copy">{item.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section-block section-block-home">
            <p className="eyebrow">ABOUT</p>
            <p className="section-copy">HANDMADE ACRYLIC ARTWORKS</p>
            <p className="section-copy section-copy-highlight">MINIMAL • MODERN • PERSONAL</p>
            <p className="section-copy section-copy-readable">
              EACH PIECE IS CREATED WITH DETAIL, DESIGNED TO FIT YOUR SPACE AND STYLE.
            </p>
          </section>

          <section className="section-block section-block-home">
            <p className="eyebrow">CUSTOM ARTWORKS</p>
            <p className="section-copy section-copy-readable">
              REQUEST A PERSONALIZED PAINTING BASED ON YOUR IDEA, STYLE, AND SPACE.
            </p>
            <Link to="/contact" className="text-link-button">
              CONTACT
            </Link>
          </section>

          {canvasWorks.length > 0 ? (
            <section className="section-block section-block-home">
              <p className="eyebrow">FEATURED WORKS</p>
              <div className="portfolio-grid">
                {canvasWorks.map((artwork) => (
                  <PortfolioCard key={artwork.id} artwork={artwork} />
                ))}
              </div>
            </section>
          ) : null}

          {testimonials.length > 0 ? (
            <section className="section-block section-block-home">
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

          <section className="section-block section-block-home">
            <p className="eyebrow">EXPLORE FULL GALLERY</p>
            {galleryPreviewItems.length > 0 ? (
              <div className="feed-preview-grid home-gallery-preview">
                {galleryPreviewItems.map((artwork) => (
                  <button
                    key={artwork.id}
                    type="button"
                    className="feed-preview-button"
                    onClick={() => navigate('/feed')}
                    aria-label={`View full gallery from ${artwork.title}`}
                  >
                    <img
                      src={artwork.src}
                      alt={artwork.title}
                      className="feed-preview-image"
                      loading="lazy"
                      decoding="async"
                      width="900"
                      height="1200"
                    />
                  </button>
                ))}
              </div>
            ) : null}
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
