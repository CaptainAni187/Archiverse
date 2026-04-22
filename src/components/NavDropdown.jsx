import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const CLOSE_DELAY_MS = 180

function NavDropdown({ label, items }) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const closeTimeoutRef = useRef(null)
  const containerRef = useRef(null)
  const isActive = items.some((item) => location.pathname === item.to)

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  const openMenu = () => {
    clearCloseTimeout()
    setIsOpen(true)
  }

  const closeMenuWithDelay = () => {
    clearCloseTimeout()
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, CLOSE_DELAY_MS)
  }

  useEffect(() => () => clearCloseTimeout(), [])

  const handleBlur = (event) => {
    if (containerRef.current?.contains(event.relatedTarget)) {
      return
    }

    closeMenuWithDelay()
  }

  return (
    <div
      ref={containerRef}
      className={`nav-dropdown ${isOpen ? 'is-open' : ''}`}
      onMouseEnter={openMenu}
      onMouseLeave={closeMenuWithDelay}
      onFocus={openMenu}
      onBlur={handleBlur}
    >
      <button
        type="button"
        className={`nav-dropdown-trigger ${isActive ? 'active-nav' : ''}`.trim()}
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {label}
      </button>
      <div className="nav-dropdown-bridge" aria-hidden="true" />
      <div className="nav-dropdown-menu">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'active-nav' : '')}
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default NavDropdown
