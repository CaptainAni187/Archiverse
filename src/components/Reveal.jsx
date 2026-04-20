import { useEffect, useRef, useState } from 'react'

function Reveal({ as = 'div', className = '', children }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const Component = as

  useEffect(() => {
    const node = ref.current

    if (!node) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <Component
      ref={ref}
      className={`${className} reveal${isVisible ? ' is-visible' : ''}`.trim()}
    >
      {children}
    </Component>
  )
}

export default Reveal
