function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString()}`
}

function AdminDashboardTab({ dashboardStats }) {
  return (
    <section className="admin-tab-panel">
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
          {dashboardStats.orders_per_day.length > 0 ? (
            dashboardStats.orders_per_day.map((item) => (
              <p key={item.date}>
                <span>{item.date}</span>
                <strong>{item.count}</strong>
              </p>
            ))
          ) : (
            <p>
              <span>No daily order data yet.</span>
              <strong>0</strong>
            </p>
          )}
        </div>
      </section>

      <section className="order-detail-card dashboard-daily-orders">
        <h3>Top Viewed AI Signals</h3>
        <div className="dashboard-daily-list">
          {dashboardStats.top_categories.length > 0 ? (
            dashboardStats.top_categories.map((item) => (
              <p key={`category-${item.label}`}>
                <span>Category: {item.label}</span>
                <strong>{item.count}</strong>
              </p>
            ))
          ) : (
            <p>
              <span>No viewed category data yet.</span>
              <strong>0</strong>
            </p>
          )}
          {dashboardStats.top_tags.length > 0 ? (
            dashboardStats.top_tags.map((item) => (
              <p key={`tag-${item.label}`}>
                <span>Tag: {item.label}</span>
                <strong>{item.count}</strong>
              </p>
            ))
          ) : (
            <p>
              <span>No viewed tag data yet.</span>
              <strong>0</strong>
            </p>
          )}
        </div>
      </section>
    </section>
  )
}

export default AdminDashboardTab
