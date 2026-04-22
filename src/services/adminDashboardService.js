import { backendAdminRequest } from './backendApiService'

const emptyDashboard = {
  total_orders: 0,
  total_revenue: 0,
  advance_revenue: 0,
  artwork_sales_count: 0,
  unique_artworks_sold: 0,
  orders_per_day: [],
}

export async function fetchDashboardAnalytics() {
  const payload = await backendAdminRequest('/api/admin/dashboard')
  const dashboard = payload.data || {}

  return {
    ...emptyDashboard,
    ...dashboard,
    orders_per_day: Array.isArray(dashboard.orders_per_day)
      ? dashboard.orders_per_day
      : [],
  }
}

export { emptyDashboard }
