function AdminSidebar({ tabs, activeTab, onChangeTab }) {
  return (
    <aside className="admin-sidebar">
      <nav className="admin-tab-nav" aria-label="Admin sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-tab-button ${activeTab === tab.id ? 'is-active' : ''}`.trim()}
            onClick={() => onChangeTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default AdminSidebar
