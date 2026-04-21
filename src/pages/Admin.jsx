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
import {
  fetchCommissions,
  updateCommissionStatus,
} from '../services/commissionService'
import {
  emptyDashboard,
  fetchDashboardAnalytics,
} from '../services/adminDashboardService'
import { uploadArtworkImages } from '../services/backendApiService'
import { ORDER_STATUSES } from '../constants/orderStatus'
import { logoutAdmin } from '../services/adminAuthService'
import ImageWithFallback from '../components/ImageWithFallback'
import usePageMeta from '../hooks/usePageMeta'
import { normalizeArtworkImages } from '../utils/artworkImages'

const initialForm = {
  images: '',
  title: '',
  price: '',
  description: '',
  medium: '',
  size: '',
  quantity: '1',
  status: 'available',
  category: 'canvas',
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
  const [commissions, setCommissions] = useState([])
  const [dashboardStats, setDashboardStats] = useState(emptyDashboard)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [artworkFilter, setArtworkFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [imageDraft, setImageDraft] = useState([])

  const loadArtworks = async () => {
    const response = await fetchArtworks()
    setArtworks(response)
  }

  const loadOrders = async () => {
    const response = await fetchOrders()
    setOrders(response)
  }

  const loadCommissions = async () => {
    const response = await fetchCommissions()
    setCommissions(response)
  }

  const loadDashboardStats = async () => {
    const response = await fetchDashboardAnalytics()
    setDashboardStats(response)
  }

  useEffect(() => {
    let isCancelled = false

    async function loadData() {
      setLoading(true)
      try {
        const [
          artworkResponse,
          orderResponse,
          commissionResponse,
          dashboardResponse,
        ] = await Promise.all([
          fetchArtworks(),
          fetchOrders(),
          fetchCommissions(),
          fetchDashboardAnalytics(),
        ])
        if (!isCancelled) {
          setArtworks(artworkResponse)
          setOrders(orderResponse)
          setCommissions(commissionResponse)
          setDashboardStats(dashboardResponse)
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

    if (name === 'images') {
      setImageDraft(normalizeArtworkImages(value))
    }
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
        images: imageDraft,
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
      setImageDraft([])
      await loadArtworks()
    } catch (error) {
      setErrorMessage(`Failed to save artwork: ${error.message}`)
    }
  }

  const onFileSelection = (event) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files.slice(0, 5))
  }

  const onUploadImages = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage('Select at least one image to upload.')
      return
    }

    const existingImages = imageDraft
    if (existingImages.length + selectedFiles.length > 5) {
      setErrorMessage('An artwork can have at most 5 images.')
      return
    }

    setIsUploadingImages(true)
    setErrorMessage('')
    setMessage('')

    try {
      const uploadedImages = await uploadArtworkImages(selectedFiles)
      const combinedImages = [...existingImages, ...uploadedImages]

      setImageDraft(combinedImages)
      setForm((previous) => ({
        ...previous,
        images: combinedImages.map((image) => image.url).join(', '),
      }))
      setSelectedFiles([])
      setMessage('Images uploaded successfully.')
    } catch (error) {
      setErrorMessage(`Failed to upload images: ${error.message}`)
    } finally {
      setIsUploadingImages(false)
    }
  }

  const onEditArtwork = (artwork) => {
    const normalizedImages = normalizeArtworkImages(artwork.images || [])

    setForm({
      title: artwork.title,
      price: String(artwork.price),
      description: artwork.description,
      medium: artwork.medium || '',
      size: artwork.size || '',
      quantity: String(artwork.quantity ?? 1),
      status: artwork.status || 'available',
      category: artwork.category || 'canvas',
      images: normalizedImages.map((image) => image.url).join(', '),
    })
    setImageDraft(normalizedImages)
    setSelectedFiles([])
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
      await Promise.all([loadOrders(), loadDashboardStats()])
      setMessage('Order status updated.')
    } catch (error) {
      setErrorMessage(`Failed to update order: ${error.message}`)
    }
  }

  const onUpdateCommissionStatus = async (commissionId, status) => {
    setMessage('')
    setErrorMessage('')
    try {
      await updateCommissionStatus(commissionId, status)
      await loadCommissions()
      setMessage('Commission status updated.')
    } catch (error) {
      setErrorMessage(`Failed to update commission: ${error.message}`)
    }
  }

  const filteredArtworks = artworks.filter((artwork) =>
    artworkFilter === 'all' ? true : artwork.status === artworkFilter,
  )
  const artworksById = Object.fromEntries(artworks.map((artwork) => [artwork.id, artwork]))
  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) || orders[0] || null
  const selectedArtwork = selectedOrder ? artworksById[selectedOrder.product_id] : null

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
          onClick={async () => {
            await logoutAdmin()
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
          Upload images
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFileSelection}
          />
        </label>
        <div className="btn-row">
          <button
            type="button"
            className="btn-secondary"
            onClick={onUploadImages}
            disabled={isUploadingImages}
          >
            {isUploadingImages ? 'Uploading…' : 'Upload Selected Images'}
          </button>
        </div>
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
          Quantity
          <input
            name="quantity"
            type="number"
            min="0"
            step="1"
            value={form.quantity}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Status
          <select name="status" value={form.status} onChange={onChange}>
            <option value="available">available</option>
            <option value="sold">sold</option>
          </select>
        </label>
        <label>
          Category
          <select name="category" value={form.category} onChange={onChange}>
            <option value="canvas">canvas</option>
            <option value="sketch">sketch</option>
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
                setSelectedFiles([])
                setImageDraft([])
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
          <strong>{dashboardStats.total_orders}</strong>
        </article>
        <article className="stat-card">
          <p>Total Revenue</p>
          <strong>{formatPrice(dashboardStats.total_revenue)}</strong>
        </article>
        <article className="stat-card">
          <p>Artwork Sales Count</p>
          <strong>{dashboardStats.artwork_sales_count}</strong>
        </article>
        <article className="stat-card">
          <p>Unique Artworks Sold</p>
          <strong>{dashboardStats.unique_artworks_sold}</strong>
        </article>
      </div>

      <section className="order-detail-card dashboard-daily-orders">
        <h3>Orders Per Day</h3>
        <div className="dashboard-daily-list">
          {dashboardStats.orders_per_day.map((item) => (
            <p key={item.date}>
              <span>{item.date}</span>
              <strong>{item.count}</strong>
            </p>
          ))}
        </div>
      </section>

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
              src={artwork.image}
              alt={artwork.title}
            />
            <div>
              <h3>{artwork.title}</h3>
              <p>{formatPrice(artwork.price)}</p>
              <p>Medium: {artwork.medium}</p>
              <p>Size: {artwork.size}</p>
              <p>Stock: {artwork.quantity}</p>
              <p>Category: {artwork.category || 'canvas'}</p>
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

      <h2 className="orders-heading">Commissions</h2>
      <div className="admin-list">
        {commissions.length === 0 ? (
          <p>No commission requests yet.</p>
        ) : (
          commissions.map((commission) => (
            <article key={commission.id} className="admin-item order-item">
              <div>
                <h3>Commission #{commission.id}</h3>
                <p>Customer: {commission.name}</p>
                <p>Email: {commission.email}</p>
                <p>Phone: {commission.phone}</p>
                <p>Type: {commission.artwork_type}</p>
                <p>Size: {commission.size}</p>
                <p>Deadline: {commission.deadline}</p>
                <p>Status: <span className={`badge status-${commission.status}`}>{commission.status}</span></p>
                <p>{commission.description}</p>
                {commission.reference_images?.length > 0 ? (
                  <div className="thumbnail-row">
                    {commission.reference_images.map((imageUrl) => (
                      <ImageWithFallback
                        key={imageUrl}
                        src={imageUrl}
                        alt={`Commission ${commission.id} reference`}
                        className="thumbnail-image"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="btn-col">
                <select
                  value={commission.status}
                  onChange={(event) => onUpdateCommissionStatus(commission.id, event.target.value)}
                >
                  <option value="pending">pending</option>
                  <option value="accepted">accepted</option>
                  <option value="rejected">rejected</option>
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
