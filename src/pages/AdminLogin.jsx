import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loginAdmin } from '../services/adminAuthService'
import usePageMeta from '../hooks/usePageMeta'

function AdminLogin() {
  usePageMeta({
    title: 'Admin Login | Archiverse',
    description: 'Secure admin login for managing Archiverse artworks and orders.',
  })

  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const onSubmit = (event) => {
    event.preventDefault()

    const isValid = loginAdmin(email.trim(), password)
    if (!isValid) {
      setErrorMessage('Invalid admin credentials.')
      return
    }

    const redirectTo = location.state?.from || '/admin'
    navigate(redirectTo, { replace: true })
  }

  return (
    <section className="auth-card">
      <h2 className="section-title">Admin Login</h2>
      <p>Use demo credentials: admin@archiverse.local / archiverse123</p>

      <form className="admin-form" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit">Login</button>
      </form>

      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
    </section>
  )
}

export default AdminLogin
