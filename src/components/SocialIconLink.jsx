function SocialIconLink({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="social-icon-link"
    >
      {children}
    </a>
  )
}

export default SocialIconLink
