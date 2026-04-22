import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  loginAdmin,
  resetAdminPassword,
  requestAdminPasswordReset,
} from '../services/adminAuthService'
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
  const [resetEmail, setResetEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetSubmitting, setIsResetSubmitting] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await loginAdmin(email.trim(), password)
      const redirectTo = location.state?.from || '/admin'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setErrorMessage(
        error.message === 'Invalid admin credentials.' ? 'Invalid credentials' : error.message,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const onForgotPassword = async (event) => {
    event.preventDefault()
    setResetMessage('')
    setErrorMessage('')
    setIsResetSubmitting(true)

    try {
      const response = await requestAdminPasswordReset(resetEmail.trim())
      setResetMessage(
        `${response.data?.message || 'Reset token generated.'} Temporary token: ${
          response.data?.resetToken || 'not generated'
        }`,
      )
    } catch (error) {
      setErrorMessage(error.message === 'Email not found.' ? 'Invalid credentials' : error.message)
    } finally {
      setIsResetSubmitting(false)
    }
  }

  const onResetPassword = async (event) => {
    event.preventDefault()
    setResetMessage('')
    setErrorMessage('')
    setIsResetSubmitting(true)

    try {
      const response = await resetAdminPassword(
        resetEmail.trim(),
        resetToken.trim(),
        newPassword,
      )
      setResetMessage(response.data?.message || 'Password reset successfully.')
      setResetToken('')
      setNewPassword('')
    } catch (error) {
      setErrorMessage(
        error.message === 'Reset token is invalid or expired.' ? 'Invalid credentials' : error.message,
      )
    } finally {
      setIsResetSubmitting(false)
    }
  }

  return (
    <section className="auth-card">
      <h2 className="section-title">Admin Login</h2>
      <p>Sign in to access the ARCHIVERSE dashboard.</p>

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
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing In...' : 'Login'}
        </button>
      </form>

      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}

      <form className="admin-form" onSubmit={onForgotPassword}>
        <label>
          Forgot Password (admin email)
          <input
            type="email"
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={isResetSubmitting}>
          {isResetSubmitting ? 'Checking...' : 'Request Reset Token'}
        </button>
      </form>
      <form className="admin-form" onSubmit={onResetPassword}>
        <label>
          Reset Token
          <input
            type="text"
            value={resetToken}
            onChange={(event) => setResetToken(event.target.value)}
            required
          />
        </label>
        <label>
          New Password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={isResetSubmitting}>
          {isResetSubmitting ? 'Updating...' : 'Reset Password'}
        </button>
      </form>
      {resetMessage ? <p className="status-message success">{resetMessage}</p> : null}
    </section>
  )
}

export default AdminLogin
