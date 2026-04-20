import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import usePageMeta from '../hooks/usePageMeta'

function About() {
  usePageMeta({
    title: 'About | Archiverse',
    description:
      'Learn the story and purpose behind Archiverse and its curated fine art journey.',
  })

  return (
    <section className="page-flow">
      <Reveal className="info-page">
        <p className="eyebrow">ABOUT</p>
        <h1 className="section-title">A simple index into the ARCHIVERSE story.</h1>
        <p>
          Explore recent works in FEED, background and experience in CV, or get in touch through CONTACT.
        </p>
        <div className="about-links">
          <Link to="/feed" className="text-link-button">
            FEED
          </Link>
          <Link to="/cv" className="text-link-button">
            CV
          </Link>
          <Link to="/contact" className="text-link-button">
            CONTACT
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

export default About
