import Reveal from '../components/Reveal'
import usePageMeta from '../hooks/usePageMeta'

function Contact() {
  usePageMeta({
    title: 'Contact | Archiverse',
    description: 'Connect with Archiverse for artwork inquiries and support.',
  })

  return (
    <section className="page-flow page-with-header-gap">
      <Reveal className="contact-layout">
        <div className="contact-copy">
          <p className="eyebrow">CONTACT</p>
          <p className="section-copy">
            FOR CUSTOM PAINTINGS, COMMISSIONS, OR INQUIRIES
          </p>
          <div className="contact-links">
            <a href="https://www.instagram.com/__archiverse_/" target="_blank" rel="noreferrer">
              INSTAGRAM
            </a>
            <a
              href="https://www.linkedin.com/in/archi-kumari-6a3489371/"
              target="_blank"
              rel="noreferrer"
            >
              LINKEDIN
            </a>
          </div>
        </div>

        <form className="contact-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            NAME
            <input type="text" name="name" placeholder="Your name" />
          </label>
          <label>
            EMAIL
            <input type="email" name="email" placeholder="Your email" />
          </label>
          <label>
            SUBJECT
            <input type="text" name="subject" placeholder="Custom painting / inquiry / message" />
          </label>
          <label>
            MESSAGE
            <textarea name="message" placeholder="Tell me about the work you have in mind." />
          </label>
          <button type="submit" className="text-link-button action-button">
            SEND INQUIRY
          </button>
        </form>
      </Reveal>
    </section>
  )
}

export default Contact
