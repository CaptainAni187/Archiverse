import paymentOrderHandler from './payment-order.js'

export default async function handler(req, res) {
  return paymentOrderHandler(req, res)
}
