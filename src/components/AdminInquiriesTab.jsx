function AdminInquiriesTab({ inquiries, inquiryReadState, onToggleInquiryRead }) {
  return (
    <section className="admin-tab-panel">
      <div className="admin-list">
        {inquiries.length === 0 ? (
          <p>No inquiries yet.</p>
        ) : (
          inquiries.map((inquiry) => {
            const isRead = inquiryReadState[inquiry.id] === true

            return (
              <article key={inquiry.id} className="admin-item order-item admin-item--compact">
                <div>
                  <h3>{inquiry.subject}</h3>
                  <p>Name: {inquiry.name}</p>
                  <p>Email: {inquiry.email}</p>
                  <p>{inquiry.message}</p>
                  <p>
                    Status: <span className={`badge ${isRead ? 'sold' : 'available'}`}>{isRead ? 'read' : 'unread'}</span>
                  </p>
                </div>
                <div className="btn-col">
                  <button type="button" onClick={() => onToggleInquiryRead(inquiry.id)}>
                    Mark as {isRead ? 'Unread' : 'Read'}
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}

export default AdminInquiriesTab
