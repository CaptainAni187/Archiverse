import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchCurrentUser,
  fetchUserOrders,
  getStoredUser,
  logoutUser,
} from '../services/userAuthService'
import usePageMeta from '../hooks/usePageMeta'
import ErrorState from '../components/ErrorState'
import { SkeletonAccount } from '../components/SkeletonLoader'
import { getUserFriendlyError } from '../utils/userErrors'

function formatPrice(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`
}

function UserAccount() {
  usePageMeta({
    title: 'My Account | Archiverse',
    description: 'View your Archiverse account and order history.',
  })

  const navigate = useNavigate()
  const [user, setUser] = useState(getStoredUser())
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let isCancelled = false

    async function loadAccount() {
      setLoading(true)
      setErrorMessage('')

      try {
        const currentUser = await fetchCurrentUser()
        if (!currentUser) {
          navigate('/login', { replace: true })
          return
        }

        const response = await fetchUserOrders()
        if (!isCancelled) {
          setUser(currentUser)
          setOrders(response)
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            getUserFriendlyError(error, 'We could not load your account right now.'),
          )
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadAccount()

    return () => {
      isCancelled = true
    }
  }, [navigate, retryKey])

  if (loading) {
    return <SkeletonAccount />
  }

  return (
    <section className="order-detail-card">
      <div className="order-detail-header">
        <div>
          <p className="order-detail-kicker">My Account</p>
          <h2 className="section-title">{user?.name || 'Account'}</h2>
          <p>{user?.email}</p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            await logoutUser()
            navigate('/login')
          }}
        >
          Logout
        </button>
      </div>

      {errorMessage ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => setRetryKey((value) => value + 1)}
        />
      ) : null}

      <h3 className="orders-heading">My Orders</h3>
      <div className="admin-list">
        {orders.length === 0 ? (
          <p>No orders found for this account email yet.</p>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="admin-item order-item">
              <div>
                <h3>{order.order_code || `Order #${order.id}`}</h3>
                <p>Artwork: {order.product_title}</p>
                <p>Status: {order.payment_status}</p>
                <p>
                  Total: {formatPrice(order.total_amount)} | Advance:{' '}
                  {formatPrice(order.advance_amount)}
                </p>
              </div>
              {order.order_code ? (
                <Link to={`/order/${encodeURIComponent(order.order_code)}`} className="text-link-button">
                  Track
                </Link>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default UserAccount
