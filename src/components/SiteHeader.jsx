import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import NavDropdown from './NavDropdown'
function SocialIcons() {
  return (
    <div className="social-links">
      <a href="https://www.instagram.com/__archiverse_/" target="_blank" rel="noreferrer">
        IG
      </a>
      <a
        href="https://www.linkedin.com/in/archi-kumari-6a3489371/"
        target="_blank"
        rel="noreferrer"
      >
        LINKEDIN
      </a>
    </div>
  )
}

function SiteHeader() {
  const location = useLocation()
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
          <NavDropdown
            label="ABOUT"
            items={[
              { to: '/feed', label: 'FEED' },
              { to: '/contact', label: 'CONTACT' },
            ]}
          />
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
