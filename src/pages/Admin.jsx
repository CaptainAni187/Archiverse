import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addArtwork,
  deleteArtwork,
  fetchArtworks,
  updateArtwork,
  updateArtworkStatus,
} from '../services/artworkService'
import {
  fetchOrders,
  updateOrderPaymentStatus,
} from '../services/orderService'
import { ORDER_STATUSES } from '../constants/orderStatus'
import { logoutAdmin } from '../services/adminAuthService'
import ImageWithFallback from '../components/ImageWithFallback'
import usePageMeta from '../hooks/usePageMeta'

const initialForm = {
  images: '',
  title: '',
  price: '',
  description: '',
  medium: '',
  size: '',
  status: 'available',
}

function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString()}`
}

function Admin() {
  usePageMeta({
    title: 'Admin Dashboard | Archiverse',
    description: 'Manage artworks and orders in the Archiverse admin dashboard.',
  })

  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [artworkFilter, setArtworkFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const loadArtworks = async () => {
    const response = await fetchArtworks()
    setArtworks(response)
  }

  const loadOrders = async () => {
    const response = await fetchOrders()
    setOrders(response)
  }

  useEffect(() => {
    let isCancelled = false

    async function loadData() {
      setLoading(true)
      try {
        const [artworkResponse, orderResponse] = await Promise.all([
          fetchArtworks(),
          fetchOrders(),
        ])
        if (!isCancelled) {
          setArtworks(artworkResponse)
          setOrders(orderResponse)
          setSelectedOrderId((previous) => previous || orderResponse[0]?.id || null)
          setErrorMessage('')
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(`Could not load admin data: ${error.message}`)
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isCancelled = true
    }
  }, [])

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')

    const normalizedTitle = form.title.trim()
    const normalizedPrice = Number(form.price)

    if (!normalizedTitle) {
      setErrorMessage('Artwork title is required.')
      return
    }

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      setErrorMessage('Artwork price must be greater than 0.')
      return
    }

    try {
      const payload = {
        ...form,
        title: normalizedTitle,
        price: normalizedPrice,
      }

      if (editingId) {
        await updateArtwork(editingId, payload)
        setMessage('Artwork updated successfully.')
      } else {
        await addArtwork(payload)
        setMessage('Artwork added successfully.')
      }

      setForm(initialForm)
      setEditingId(null)
      await loadArtworks()
    } catch (error) {
      setErrorMessage(`Failed to save artwork: ${error.message}`)
    }
  }

  const onEditArtwork = (artwork) => {
    setForm({
      title: artwork.title,
      price: String(artwork.price),
      description: artwork.description,
      medium: artwork.medium || '',
      size: artwork.size || '',
      status: artwork.status || 'available',
      images: (artwork.images || []).join(', '),
    })
    setEditingId(artwork.id)
    setMessage('')
    setErrorMessage('')
  }

  const onDeleteArtwork = async (id) => {
    if (!window.confirm('Delete this artwork permanently?')) {
      return
    }

    setMessage('')
    setErrorMessage('')
    try {
      await deleteArtwork(id)
      await loadArtworks()
      setMessage('Artwork deleted successfully.')
    } catch (error) {
      setErrorMessage(`Failed to delete artwork: ${error.message}`)
    }
  }

  const onChangeArtworkStatus = async (id, status) => {
    setMessage('')
    setErrorMessage('')
    try {
      await updateArtworkStatus(id, status)
      await loadArtworks()
      setMessage('Artwork status updated.')
    } catch (error) {
      setErrorMessage(`Failed to update status: ${error.message}`)
    }
  }

  const onUpdateOrderStatus = async (orderId, paymentStatus) => {
    setMessage('')
    setErrorMessage('')
    try {
      await updateOrderPaymentStatus(orderId, paymentStatus)
      await loadOrders()
      setMessage('Order status updated.')
    } catch (error) {
      setErrorMessage(`Failed to update order: ${error.message}`)
    }
  }

  const filteredArtworks = artworks.filter((artwork) =>
    artworkFilter === 'all' ? true : artwork.status === artworkFilter,
  )
  const artworksById = Object.fromEntries(artworks.map((artwork) => [artwork.id, artwork]))
  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) || orders[0] || null
  const selectedArtwork = selectedOrder ? artworksById[selectedOrder.product_id] : null
  const successfulOrders = orders.filter((order) =>
    ['advance_paid', 'fully_paid'].includes(order.payment_status),
  )
  const dashboardStats = {
    totalOrders: orders.length,
    advanceRevenue: successfulOrders.reduce(
      (sum, order) => sum + Number(order.advance_amount || 0),
      0,
    ),
    soldArtworks: new Set(successfulOrders.map((order) => order.product_id)).size,
  }

  if (loading) {
    return <p className="status-message">Loading admin data...</p>
  }

  if (errorMessage && artworks.length === 0 && orders.length === 0) {
    return <p className="status-message error">{errorMessage}</p>
  }

  return (
    <section>
      <div className="admin-header">
        <h2 className="section-title">Admin Dashboard</h2>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            logoutAdmin()
            navigate('/admin/login')
          }}
        >
          Logout
        </button>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        <label>
          Image URLs (comma separated)
          <input
            name="images"
            value={form.images}
            onChange={onChange}
            placeholder="https://img1.jpg, https://img2.jpg"
            required
          />
        </label>
        <label>
          Title
          <input name="title" value={form.title} onChange={onChange} required />
        </label>
        <label>
          Price
          <input
            name="price"
            type="number"
            min="1"
            value={form.price}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Medium
          <input name="medium" value={form.medium} onChange={onChange} required />
        </label>
        <label>
          Size
          <input name="size" value={form.size} onChange={onChange} required />
        </label>
        <label>
          Status
          <select name="status" value={form.status} onChange={onChange}>
            <option value="available">available</option>
            <option value="sold">sold</option>
          </select>
        </label>
        <div className="btn-row">
          <button type="submit">{editingId ? 'Update Artwork' : 'Add Artwork'}</button>
          {editingId ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditingId(null)
                setForm(initialForm)
              }}
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
      {message ? <p className="status-message success">{message}</p> : null}

      <div className="stats-grid">
        <article className="stat-card">
          <p>Total Orders</p>
          <strong>{dashboardStats.totalOrders}</strong>
        </article>
        <article className="stat-card">
          <p>Advance Revenue</p>
          <strong>{formatPrice(dashboardStats.advanceRevenue)}</strong>
        </article>
        <article className="stat-card">
          <p>Sold Artworks</p>
          <strong>{dashboardStats.soldArtworks}</strong>
        </article>
      </div>

      <div className="filter-row">
        <span>Artwork filter:</span>
        <button
          type="button"
          className={artworkFilter === 'all' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => setArtworkFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={artworkFilter === 'available' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => setArtworkFilter('available')}
        >
          Available
        </button>
        <button
          type="button"
          className={artworkFilter === 'sold' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => setArtworkFilter('sold')}
        >
          Sold
        </button>
      </div>

      <div className="admin-list">
        {filteredArtworks.length === 0 ? (
          <p className="status-message">No artworks found.</p>
        ) : (
          filteredArtworks.map((artwork) => (
          <article key={artwork.id} className="admin-item">
            <ImageWithFallback
              src={artwork.images?.[0] || artwork.image}
              alt={artwork.title}
            />
            <div>
              <h3>{artwork.title}</h3>
              <p>{formatPrice(artwork.price)}</p>
              <p>Medium: {artwork.medium}</p>
              <p>Size: {artwork.size}</p>
              <p>
                Status:{' '}
                <span
                  className={`badge ${artwork.status === 'sold' ? 'sold' : 'available'}`}
                >
                  {artwork.status || 'available'}
                </span>
              </p>
            </div>
            <div className="btn-col">
              <select
                value={artwork.status || 'available'}
                onChange={(event) =>
                  onChangeArtworkStatus(artwork.id, event.target.value)
                }
              >
                <option value="available">available</option>
                <option value="sold">sold</option>
              </select>
              <button type="button" onClick={() => onEditArtwork(artwork)}>
                Edit
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => onDeleteArtwork(artwork.id)}
              >
                Delete
              </button>
            </div>
          </article>
          ))
        )}
      </div>

      <h2 className="orders-heading">Orders</h2>
      {selectedOrder ? (
        <section className="order-detail-card">
          <div className="order-detail-header">
            <div>
              <p className="order-detail-kicker">Selected order</p>
              <h3>{selectedOrder.order_code || `Order #${selectedOrder.id}`}</h3>
            </div>
            <span className={`badge status-${selectedOrder.payment_status}`}>
              {selectedOrder.payment_status}
            </span>
          </div>
          <div className="order-detail-grid">
            <div>
              <h4>Customer</h4>
              <p>{selectedOrder.customer_name}</p>
              <p>{selectedOrder.customer_email}</p>
              <p>{selectedOrder.customer_phone}</p>
              <p>{selectedOrder.customer_address}</p>
            </div>
            <div>
              <h4>Product</h4>
              <p>{selectedOrder.product_title}</p>
              <p>Total: {formatPrice(selectedOrder.total_amount)}</p>
              <p>Advance: {formatPrice(selectedOrder.advance_amount)}</p>
              {selectedArtwork ? (
                <>
                  <p>Medium: {selectedArtwork.medium}</p>
                  <p>Size: {selectedArtwork.size}</p>
                  <p>Status: {selectedArtwork.status}</p>
                </>
              ) : (
                <p>Artwork details are unavailable in the current catalog snapshot.</p>
              )}
            </div>
            <div>
              <h4>Payment</h4>
              <p>Payment ID: {selectedOrder.razorpay_payment_id || 'Not recorded'}</p>
              <p>Razorpay Order ID: {selectedOrder.razorpay_order_id || 'Not recorded'}</p>
              <p>
                Verified:{' '}
                {selectedOrder.payment_verified_at
                  ? new Date(selectedOrder.payment_verified_at).toLocaleString()
                  : 'Pending'}
              </p>
            </div>
          </div>
        </section>
      ) : null}
      <div className="admin-list">
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          orders.map((order) => (
            <article
              key={order.id}
              className={`admin-item order-item ${
                order.id === selectedOrder?.id ? 'selected-order' : ''
              }`}
              onClick={() => setSelectedOrderId(order.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedOrderId(order.id)
                }
              }}
            >
              <div>
                <h3>{order.order_code || `Order #${order.id}`}</h3>
                <p>Artwork: {order.product_title}</p>
                <p>Customer: {order.customer_name}</p>
                <p>Phone: {order.customer_phone}</p>
                <p>Email: {order.customer_email}</p>
                <p>
                  Total: {formatPrice(order.total_amount)} | Advance:{' '}
                  {formatPrice(order.advance_amount)}
                </p>
                <p>
                  Payment:{' '}
                  <span className={`badge status-${order.payment_status}`}>
                    {order.payment_status}
                  </span>
                </p>
              </div>
              <div className="btn-col">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  View Details
                </button>
                <select
                  value={order.payment_status}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onUpdateOrderStatus(order.id, event.target.value)}
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default Admin
