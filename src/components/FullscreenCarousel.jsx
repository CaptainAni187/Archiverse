import { useEffect, useMemo, useState } from 'react'
import ImageWithFallback from './ImageWithFallback'

function FullscreenCarousel({
  artworks,
  autoSlide = true,
  interval = 5000,
  overlayContent = null,
  showMeta = true,
}) {
  const slides = useMemo(
    () =>
      artworks
        .filter(Boolean)
        .map((artwork) => ({
          id: artwork.id || artwork.title,
          image: artwork.image,
          title: artwork.title || 'UNTITLED',
          medium: artwork.medium || 'ACRYLIC',
        }))
        .filter((slide) => Boolean(slide.image)),
    [artworks],
  )
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!autoSlide || slides.length <= 1) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setActiveIndex((previous) => (previous + 1) % slides.length)
    }, interval)

    return () => window.clearInterval(timerId)
  }, [autoSlide, interval, slides.length])

  if (slides.length === 0) {
    return (
      <section className="fullscreen-carousel">
        <div className="carousel-stage full-bleed">
          <div className="carousel-placeholder" />
        </div>
      </section>
    )
  }

  const goPrevious = () => {
    setActiveIndex((previous) => (previous - 1 + slides.length) % slides.length)
  }

  const goNext = () => {
    setActiveIndex((previous) => (previous + 1) % slides.length)
  }

  return (
    <section className="fullscreen-carousel">
      <div className="carousel-stage full-bleed">
        {slides.map((slide, index) => (
          <ImageWithFallback
            key={`${slide.id}-${index}`}
            src={slide.image}
            alt={slide.title}
            className={`carousel-image ${index === activeIndex ? 'is-active' : ''}`}
            loading={index === activeIndex ? 'eager' : 'lazy'}
            fetchPriority={index === activeIndex ? 'high' : undefined}
            sizes="100vw"
            maxWidth={2200}
          />
        ))}

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              className="carousel-arrow carousel-arrow-left"
              onClick={goPrevious}
              aria-label="Previous slide"
            >
              ←
            </button>
            <button
              type="button"
              className="carousel-arrow carousel-arrow-right"
              onClick={goNext}
              aria-label="Next slide"
            >
              →
            </button>
          </>
        ) : null}

        {overlayContent ? (
          <div className="carousel-overlay-content">
            {overlayContent(slides[activeIndex], activeIndex)}
          </div>
        ) : null}
        {showMeta ? (
          <div className="carousel-meta">
            <p className="carousel-meta-title">{slides[activeIndex]?.title}</p>
            <p className="carousel-meta-medium">{slides[activeIndex]?.medium}</p>
            <p className="carousel-meta-medium">2026</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default FullscreenCarousel
