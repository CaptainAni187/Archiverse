function AdminCommissionsTab({ commissions, onUpdateCommissionStatus }) {
  return (
    <section className="admin-tab-panel">
      <div className="admin-list">
        {commissions.length === 0 ? (
          <p>No commission requests yet.</p>
        ) : (
          commissions.map((commission) => (
            <article key={commission.id} className="admin-item order-item admin-item--compact">
              <div>
                <h3>Commission #{commission.id}</h3>
                <p>Customer: {commission.name}</p>
                <p>Email: {commission.email}</p>
                <p>Phone: {commission.phone}</p>
                <p>Type: {commission.artwork_type}</p>
                <p>Size: {commission.size}</p>
                <p>Deadline: {commission.deadline}</p>
                <p>
                  Status: <span className={`badge status-${commission.status}`}>{commission.status}</span>
                </p>
                <p>{commission.description}</p>
                {commission.reference_images?.length > 0 ? (
                  <div className="thumbnail-row">
                    {commission.reference_images.map((imageUrl) => (
                      <img
                        key={imageUrl}
                        src={imageUrl}
                        alt={`Commission ${commission.id} reference`}
                        className="thumbnail-image"
                        loading="lazy"
                        decoding="async"
                        width="240"
                        height="240"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="btn-col">
                <select
                  value={commission.status}
                  onChange={(event) => onUpdateCommissionStatus(commission.id, event.target.value)}
                >
                  <option value="pending">pending</option>
                  <option value="accepted">accepted</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default AdminCommissionsTab
