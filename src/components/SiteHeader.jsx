import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import NavDropdown from './NavDropdown'
function SocialIcons() {
  return (
    <div className="social-links">
      <a
        href="https://www.instagram.com/__archiverse_/"
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram"
      >
        <svg className="social-icon" aria-hidden="true">
          <use href="/icons.svg#instagram-icon" />
        </svg>
        <span className="sr-only">Instagram</span>
      </a>
      <a
        href="https://www.linkedin.com/in/archi-kumari-6a3489371/"
        target="_blank"
        rel="noreferrer"
        aria-label="LinkedIn"
      >
        <svg className="social-icon" aria-hidden="true">
          <use href="/icons.svg#linkedin-icon" />
        </svg>
        <span className="sr-only">LinkedIn</span>
      </a>
    </div>
  )
}

function SiteHeader() {
  const location = useLocation()
  const aboutItems = [
    { to: '/feed', label: 'FEED' },
    { to: '/contact', label: 'CONTACT' },
  ]
  const isOverlay =
    location.pathname === '/' ||
    location.pathname === '/canvas' ||
    location.pathname === '/sketch'
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`topbar ${isOverlay ? 'is-overlay' : ''} ${isScrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="brand-mark" aria-label="ARCHIVERSE home">
        ARCHIVERSE
      </Link>

      <div className="topbar-cluster">
        <nav className="topbar-nav" aria-label="Primary">
          <NavLink to="/canvas" className={({ isActive }) => (isActive ? 'active-nav' : '')}>
            CANVAS
          </NavLink>
          <NavLink to="/sketch" className={({ isActive }) => (isActive ? 'active-nav' : '')}>
            SKETCH
          </NavLink>
          <NavDropdown label="ABOUT" items={aboutItems} />
          <NavLink
            to="/store"
            className={({ isActive }) => (isActive ? 'active-nav' : '')}
          >
            STORE
          </NavLink>
        </nav>

        <SocialIcons />
      </div>
    </header>
  )
}

export default SiteHeader
