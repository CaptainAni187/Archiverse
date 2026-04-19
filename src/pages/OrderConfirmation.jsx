import { Link, Navigate } from 'react-router-dom'
import { useOrderContext } from '../state/useOrderContext'
import usePageMeta from '../hooks/usePageMeta'

function formatPrice(value) {
  return `Rs. ${Number(value).toLocaleString()}`
}

function OrderConfirmation() {
  const { orderConfirmation } = useOrderContext()
  const savedConfirmation = sessionStorage.getItem('archiverse_order_confirmation')
  const confirmation =
    orderConfirmation || (savedConfirmation ? JSON.parse(savedConfirmation) : null)

  usePageMeta({
    title: 'Order Confirmation | Archiverse',
    description: 'Review your Archiverse advance payment confirmation details.',
  })

  if (!confirmation) {
    return <Navigate to="/gallery" replace />
  }

  return (
    <section className="confirmation-card">
      <h2 className="section-title">Payment Confirmed</h2>
      <p>Your advance payment has been received successfully.</p>
      <p>
        <strong>Order ID:</strong> {confirmation.orderId}
      </p>
      {confirmation.paymentId ? (
        <p>
          <strong>Payment ID:</strong> {confirmation.paymentId}
        </p>
      ) : null}
      <p>
        <strong>Product:</strong> {confirmation.productTitle}
      </p>
      <p>
        <strong>Advance Paid:</strong> {formatPrice(confirmation.advanceAmount)}
      </p>
      <p>
        <strong>Remaining on Delivery:</strong> {formatPrice(confirmation.remainingAmount)}
      </p>
      <Link to="/gallery" className="link-button">
        Back to Gallery
      </Link>
    </section>
  )
}

export default OrderConfirmation
