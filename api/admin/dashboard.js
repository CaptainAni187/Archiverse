import { requireAdminAuth } from '../_lib/adminSession.js'
import { methodNotAllowed, sendJson } from '../_lib/http.js'
import { fetchOrderAnalyticsRows } from '../_lib/supabaseAdmin.js'

const REVENUE_STATUSES = ['advance_paid', 'processing', 'shipped', 'delivered']

function toDateKey(value) {
  const date = value ? new Date(value) : new Date()

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function getLastSevenDayKeys(now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - (6 - index))
    return date.toISOString().slice(0, 10)
  })
}

function buildDashboardAnalytics(orders) {
  const successfulOrders = orders.filter((order) =>
    REVENUE_STATUSES.includes(order.payment_status),
  )
  const ordersByDay = new Map()

  orders.forEach((order) => {
    const dateKey = toDateKey(order.created_at)
    ordersByDay.set(dateKey, (ordersByDay.get(dateKey) || 0) + 1)
  })

  return {
    total_orders: orders.length,
    total_revenue: successfulOrders.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0,
    ),
    advance_revenue: successfulOrders.reduce(
      (sum, order) => sum + Number(order.advance_amount || 0),
      0,
    ),
    artwork_sales_count: successfulOrders.length,
    unique_artworks_sold: new Set(
      successfulOrders.map((order) => order.product_id).filter(Boolean),
    ).size,
    orders_per_day: getLastSevenDayKeys().map((date) => ({
      date,
      count: ordersByDay.get(date) || 0,
    })),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  try {
    if (!requireAdminAuth(req, res)) {
      return null
    }

    const orders = await fetchOrderAnalyticsRows()

    return sendJson(res, 200, {
      success: true,
      dashboard: buildDashboardAnalytics(orders),
    })
  } catch (error) {
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Unable to load dashboard analytics.',
    })
  }
}
