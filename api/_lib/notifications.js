function maskEmail(email) {
  if (!email || !email.includes('@')) {
    return 'not-provided'
  }

  const [local, domain] = email.split('@')
  const visibleLocal = local.slice(0, 2)
  return `${visibleLocal}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`
}

function maskPhone(phone) {
  if (!phone) {
    return 'not-provided'
  }

  return `${phone.slice(0, 2)}${'*'.repeat(Math.max(phone.length - 4, 1))}${phone.slice(-2)}`
}

async function sendResendEmail({ resendApiKey, fromEmail, to, subject, html }) {
  if (!resendApiKey || !fromEmail || !to) {
    return { delivered: false, skipped: true }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    return { delivered: false, skipped: false }
  }

  return { delivered: true, skipped: false }
}

export async function notifyAdmin(order, config) {
  const structuredLog = {
    type: 'archiverse.order.created',
    orderCode: order.order_code,
    productTitle: order.product_title,
    totalAmount: order.total_amount,
    advanceAmount: order.advance_amount,
    paymentStatus: order.payment_status,
    paymentId: order.razorpay_payment_id,
    customer: {
      name: order.customer_name,
      email: maskEmail(order.customer_email),
      phone: maskPhone(order.customer_phone),
    },
  }

  console.info(JSON.stringify(structuredLog))

  const webhookPromise = config.adminNotificationWebhookUrl
    ? fetch(config.adminNotificationWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderCode: order.order_code,
          productTitle: order.product_title,
          totalAmount: order.total_amount,
          advanceAmount: order.advance_amount,
          paymentStatus: order.payment_status,
          paymentId: order.razorpay_payment_id,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          customerAddress: order.customer_address,
        }),
      }).catch(() => null)
    : Promise.resolve(null)

  const emailPromise = sendResendEmail({
    resendApiKey: config.resendApiKey,
    fromEmail: config.fromEmail,
    to: config.adminNotificationEmail,
    subject: `New Archiverse order ${order.order_code}`,
    html: `
      <h2>New order received</h2>
      <p><strong>Order:</strong> ${order.order_code}</p>
      <p><strong>Artwork:</strong> ${order.product_title}</p>
      <p><strong>Advance Paid:</strong> Rs. ${Number(order.advance_amount).toLocaleString()}</p>
      <p><strong>Total:</strong> Rs. ${Number(order.total_amount).toLocaleString()}</p>
      <p><strong>Customer:</strong> ${order.customer_name}</p>
      <p><strong>Email:</strong> ${order.customer_email}</p>
      <p><strong>Phone:</strong> ${order.customer_phone}</p>
      <p><strong>Address:</strong> ${order.customer_address}</p>
    `,
  }).catch(() => ({ delivered: false, skipped: false }))

  const [, emailStatus] = await Promise.all([webhookPromise, emailPromise])
  return { emailStatus }
}

export async function notifyCustomer(order, config) {
  return sendResendEmail({
    resendApiKey: config.resendApiKey,
    fromEmail: config.fromEmail,
    to: order.customer_email,
    subject: `Your Archiverse order ${order.order_code}`,
    html: `
      <h2>Payment confirmed</h2>
      <p>Thank you for your Archiverse order.</p>
      <p><strong>Order:</strong> ${order.order_code}</p>
      <p><strong>Artwork:</strong> ${order.product_title}</p>
      <p><strong>Advance Paid:</strong> Rs. ${Number(order.advance_amount).toLocaleString()}</p>
      <p><strong>Remaining on Delivery:</strong> Rs. ${(
        Number(order.total_amount) - Number(order.advance_amount)
      ).toLocaleString()}</p>
    `,
  }).catch(() => ({ delivered: false, skipped: false }))
}
