import usePageMeta from '../hooks/usePageMeta'

function About() {
  usePageMeta({
    title: 'About | Archiverse',
    description:
      'Learn the story and purpose behind Archiverse and its curated fine art journey.',
  })

  return (
    <section className="info-page">
      <h2 className="section-title">About Archiverse</h2>
      <p>
        Archiverse began as a curated space for original works that blend visual
        storytelling with timeless interiors. We work with artists and collectors
        who appreciate intent, texture, and character.
      </p>
      <p>
        Our purpose is simple: make high-quality art accessible through a clear,
        trusted, and transparent buying process with human support at every step.
      </p>
    </section>
  )
}

export default About
