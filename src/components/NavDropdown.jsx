import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'

const CLOSE_DELAY_MS = 180

function NavDropdown({ label, items }) {
  const [isOpen, setIsOpen] = useState(false)
  const closeTimeoutRef = useRef(null)

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

  return (
    <div
      className={`nav-dropdown ${isOpen ? 'is-open' : ''}`}
      onMouseEnter={openMenu}
      onMouseLeave={closeMenuWithDelay}
      onFocus={openMenu}
      onBlur={closeMenuWithDelay}
    >
      <button
        type="button"
        className="nav-dropdown-trigger"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
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
