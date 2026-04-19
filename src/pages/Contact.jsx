import usePageMeta from '../hooks/usePageMeta'

function Contact() {
  usePageMeta({
    title: 'Contact | Archiverse',
    description: 'Connect with Archiverse for artwork inquiries and support.',
  })

  return (
    <section className="info-page">
      <h2 className="section-title">Contact</h2>
      <p>Email: support@archiverse.art</p>
      <p>
        Instagram:{' '}
        <a href="https://instagram.com/archiverse.art" target="_blank" rel="noreferrer">
          @archiverse.art
        </a>
      </p>
      <p>
        WhatsApp:{' '}
        <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer">
          +91 99999 99999
        </a>
      </p>
    </section>
  )
}

export default Contact
