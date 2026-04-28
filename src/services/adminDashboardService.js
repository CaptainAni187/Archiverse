import { backendAdminRequest } from './backendApiService'

const emptyDashboard = {
  total_orders: 0,
  total_revenue: 0,
  advance_revenue: 0,
  artwork_sales_count: 0,
  unique_artworks_sold: 0,
  orders_per_day: [],
  top_tags: [],
  top_categories: [],
  inspected_events: 0,
}

export async function fetchDashboardAnalytics() {
  const payload = await backendAdminRequest('/api/admin/dashboard')
  let aiSummary = {}

  try {
    const analyticsPayload = await backendAdminRequest('/api/analytics')
    aiSummary = analyticsPayload.data || {}
  } catch {
    aiSummary = {}
  }

  const dashboard = payload.data || {}

  return {
    ...emptyDashboard,
    ...dashboard,
    ...aiSummary,
    orders_per_day: Array.isArray(dashboard.orders_per_day)
      ? dashboard.orders_per_day
      : [],
    top_tags: Array.isArray(aiSummary.top_tags) ? aiSummary.top_tags : [],
    top_categories: Array.isArray(aiSummary.top_categories) ? aiSummary.top_categories : [],
  }
}

export { emptyDashboard }
