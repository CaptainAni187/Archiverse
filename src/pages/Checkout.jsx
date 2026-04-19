import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createOrder } from '../services/orderService'
import { useOrderContext } from '../state/useOrderContext'
import ImageWithFallback from '../components/ImageWithFallback'
import {
  loadRazorpayScript,
  openRazorpayCheckout,
} from '../services/razorpayService'
import {
  createPaymentOrder,
  verifyPayment,
} from '../services/backendApiService'
import { findOrderByPaymentId } from '../services/orderService'
import usePageMeta from '../hooks/usePageMeta'

function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString()}`
}

const initialForm = {
  name: '',
  phone: '',
  address: '',
  email: '',
}

const CONFIRMATION_STORAGE_KEY = 'archiverse_order_confirmation'
const PENDING_CHECKOUT_STORAGE_KEY = 'archiverse_pending_checkout'

function buildConfirmation(order) {
  return {
    orderId: order.order_code || `Order #${order.id}`,
    orderCode: order.order_code || null,
    productTitle: order.product_title,
    advanceAmount: order.advance_amount,
    remainingAmount: Number(order.total_amount) - Number(order.advance_amount),
    paymentId: order.razorpay_payment_id || null,
  }
}

function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    selectedProduct,
    setOrderDetails,
    setSelectedProduct,
    setOrderConfirmation,
  } = useOrderContext()
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isRazorpayReady, setIsRazorpayReady] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState('')

  usePageMeta({
    title: 'Checkout | Archiverse',
    description:
      'Securely pay 50% advance for your selected artwork from Archiverse.',
  })

  useEffect(() => {
    if (!selectedProduct && location.state?.product) {
      setSelectedProduct(location.state.product)
    }
  }, [selectedProduct, location.state, setSelectedProduct])

  useEffect(() => {
    let isActive = true
    loadRazorpayScript()
      .then((loaded) => {
        if (isActive) {
          setIsRazorpayReady(loaded)
        }
      })
      .catch(() => {
        if (isActive) {
          setIsRazorpayReady(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function recoverPendingCheckout() {
      const savedPendingCheckout = sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY)

      if (!savedPendingCheckout) {
        return
      }

      try {
        const pendingCheckout = JSON.parse(savedPendingCheckout)
        const existingOrder = await findOrderByPaymentId(
          pendingCheckout.payment.razorpay_payment_id,
        )

        if (!isActive) {
          return
        }

        const confirmation = buildConfirmation(existingOrder)
        sessionStorage.setItem(
          CONFIRMATION_STORAGE_KEY,
          JSON.stringify(confirmation),
        )
        setOrderDetails(existingOrder)
        setOrderConfirmation(confirmation)
        navigate('/checkout/confirmation', { replace: true })
      } catch {
        if (isActive) {
          setRecoveryMessage(
            'We found a completed payment awaiting confirmation. Use Resume Confirmation to finish recovering the order.',
          )
        }
      }
    }

    recoverPendingCheckout()

    return () => {
      isActive = false
    }
  }, [navigate, setOrderConfirmation, setOrderDetails])

  if (!selectedProduct) {
    return (
      <section>
        <p className="status-message">No artwork selected yet.</p>
        <Link to="/gallery">Back to gallery</Link>
      </section>
    )
  }

  const price = Number(selectedProduct.price)
  const advanceAmount = price / 2

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const finalizeSuccessfulOrder = (createdOrder, successCopy) => {
    const confirmation = buildConfirmation(createdOrder)

    sessionStorage.setItem(
      CONFIRMATION_STORAGE_KEY,
      JSON.stringify(confirmation),
    )
    sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY)

    setOrderDetails(createdOrder)
    setOrderConfirmation(confirmation)
    setSuccessMessage(successCopy)
    setForm(initialForm)
    navigate('/checkout/confirmation')
  }

  const recoverPendingCheckout = async () => {
    const savedPendingCheckout = sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY)

    if (!savedPendingCheckout) {
      setRecoveryMessage('')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    setRecoveryMessage('')

    try {
      const pendingCheckout = JSON.parse(savedPendingCheckout)

      try {
        const existingOrder = await findOrderByPaymentId(
          pendingCheckout.payment.razorpay_payment_id,
        )
        finalizeSuccessfulOrder(existingOrder, 'Payment already confirmed. Restoring your order.')
        return
      } catch {
        // Continue to verification and order creation retry.
      }

      const verificationResult = await verifyPayment(pendingCheckout.payment)

      if (!verificationResult.verified) {
        throw new Error('Payment could not be verified. Please contact support before retrying.')
      }

      const createdOrder = await createOrder({
        customer_name: pendingCheckout.customer.name,
        customer_phone: pendingCheckout.customer.phone,
        customer_address: pendingCheckout.customer.address,
        customer_email: pendingCheckout.customer.email,
        product_id: pendingCheckout.product.id,
        payment_status: 'advance_paid',
        ...pendingCheckout.payment,
      })

      finalizeSuccessfulOrder(createdOrder, 'Payment confirmed and your order has been restored.')
    } catch (error) {
      setErrorMessage(
        error.message ||
          'We could not recover your payment confirmation yet. Please contact support with your payment ID.',
      )
      setRecoveryMessage(
        'Your payment may already be captured. Please avoid paying again until confirmation is recovered.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = form.name.trim()
    const trimmedAddress = form.address.trim()
    const trimmedEmail = form.email.trim()
    const normalizedPhone = form.phone.replace(/[\s-]/g, '')
    if (isSubmitting || successMessage) {
      return
    }

    if (!trimmedName || !normalizedPhone || !trimmedAddress || !trimmedEmail) {
      setErrorMessage('All fields are required.')
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    const phonePattern = /^\+?[0-9]{10,15}$/

    if (!phonePattern.test(normalizedPhone)) {
      setErrorMessage('Please enter a valid phone number.')
      return
    }

    setIsSubmitting(true)
    setSuccessMessage('')
    setErrorMessage('')
    setRecoveryMessage('')

    try {
      if (!isRazorpayReady) {
        throw new Error('Payment service is not ready. Please refresh and try again.')
      }

      const paymentOrder = await createPaymentOrder(selectedProduct.id)
      const paymentResult = await new Promise((resolve, reject) => {
        openRazorpayCheckout({
          amountInPaise: paymentOrder.amount,
          orderId: paymentOrder.id,
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          customerPhone: normalizedPhone,
          productTitle: selectedProduct.title,
          onSuccess: resolve,
          onFailure: (error) => reject(new Error(error?.description || 'Payment failed.')),
          onCancel: () => reject(new Error('Payment cancelled by user.')),
        })
      })

      sessionStorage.setItem(
        PENDING_CHECKOUT_STORAGE_KEY,
        JSON.stringify({
          payment: paymentResult,
          customer: {
            name: trimmedName,
            phone: normalizedPhone,
            address: trimmedAddress,
            email: trimmedEmail,
          },
          product: {
            id: selectedProduct.id,
            title: selectedProduct.title,
          },
        }),
      )

      const verificationResult = await verifyPayment(paymentResult)

      if (!verificationResult.verified) {
        throw new Error('Payment could not be verified. No order was created.')
      }

      const createdOrder = await createOrder({
        customer_name: trimmedName,
        customer_phone: normalizedPhone,
        customer_address: trimmedAddress,
        customer_email: trimmedEmail,
        product_id: selectedProduct.id,
        payment_status: 'advance_paid',
        ...paymentResult,
      })

      finalizeSuccessfulOrder(createdOrder, 'Payment successful. Order confirmed.')
    } catch (error) {
      const hasPendingPayment = Boolean(
        sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY),
      )

      setErrorMessage(
        hasPendingPayment
          ? `Payment received, but confirmation is still pending: ${error.message}`
          : `Could not place order: ${error.message}`,
      )

      if (hasPendingPayment) {
        setRecoveryMessage(
          'Do not retry payment yet. Use Resume Confirmation to recover the order from your completed payment.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="checkout-layout">
      <div className="checkout-product">
        <h2 className="section-title">Checkout</h2>
        <ImageWithFallback
          src={selectedProduct.images?.[0] || selectedProduct.image}
          alt={selectedProduct.title}
        />
        <h3>{selectedProduct.title}</h3>
        <p>Total: {formatPrice(price)}</p>
        <p>Advance (50%): {formatPrice(advanceAmount)}</p>
        <p>Remaining 50% payable on delivery.</p>
      </div>

      <form className="checkout-form" onSubmit={onSubmit}>
        <label>
          Name
          <input name="name" value={form.name} onChange={onChange} required />
        </label>
        <label>
          Phone
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            placeholder="+91XXXXXXXXXX"
            required
          />
        </label>
        <label>
          Address
          <textarea
            name="address"
            value={form.address}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
          />
        </label>

        <button type="submit" disabled={isSubmitting || Boolean(successMessage)}>
          {isSubmitting ? 'Processing Payment...' : 'Pay 50% Advance'}
        </button>
        {recoveryMessage ? <p className="status-message">{recoveryMessage}</p> : null}
        {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
        {successMessage ? <p className="status-message success">{successMessage}</p> : null}
        {recoveryMessage ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={recoverPendingCheckout}
            disabled={isSubmitting}
          >
            Resume Confirmation
          </button>
        ) : null}
        {successMessage ? (
          <Link to="/checkout/confirmation" className="link-button">
            View Confirmation
          </Link>
        ) : null}
      </form>
    </section>
  )
}

export default Checkout
