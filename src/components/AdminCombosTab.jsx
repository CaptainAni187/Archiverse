function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString()}`
}

function AdminCombosTab({
  comboForm,
  editingComboId,
  combos,
  artworks,
  onChangeComboField,
  onToggleComboArtwork,
  onSubmitCombo,
  onCancelEditCombo,
  onEditCombo,
  onToggleComboActive,
  onDeleteCombo,
}) {
  return (
    <section className="admin-tab-panel">
      <form className="admin-form" onSubmit={onSubmitCombo}>
        <label>
          Combo Title
          <input
            name="title"
            value={comboForm.title}
            onChange={onChangeComboField}
            required
          />
        </label>
        <label>
          Discount Percent
          <input
            name="discount_percent"
            type="number"
            min="1"
            max="50"
            value={comboForm.discount_percent}
            onChange={onChangeComboField}
            required
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="is_active"
            checked={comboForm.is_active}
            onChange={onChangeComboField}
          />
          Active
        </label>
        <div>
          <p>Select 2-5 artworks</p>
          {artworks.map((artwork) => {
            const checked = comboForm.artwork_ids.includes(Number(artwork.id))

            return (
              <label key={artwork.id}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleComboArtwork(artwork.id)}
                />
                {artwork.title} ({formatPrice(artwork.price)})
              </label>
            )
          })}
        </div>
        <div className="btn-row">
          <button type="submit">{editingComboId ? 'Update Combo' : 'Create Combo'}</button>
          {editingComboId ? (
            <button type="button" className="btn-secondary" onClick={onCancelEditCombo}>
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-list">
        {combos.length === 0 ? (
          <p className="status-message">No combos found.</p>
        ) : (
          combos.map((combo) => (
            <article key={combo.id} className="admin-item">
              <div>
                <h3>{combo.title}</h3>
                <p>Discount: {combo.discount_percent}%</p>
                <p>
                  Artworks:{' '}
                  {Array.isArray(combo.items) && combo.items.length > 0
                    ? combo.items.map((artwork) => artwork.title).join(', ')
                    : 'none'}
                </p>
                <p>
                  Combo Price:{' '}
                  {combo.pricing ? formatPrice(combo.pricing.totalAmount) : 'Unavailable'}
                </p>
                <p>
                  Status:{' '}
                  <span className={`badge ${combo.is_active ? 'available' : 'sold'}`}>
                    {combo.is_active ? 'active' : 'inactive'}
                  </span>
                </p>
                <p>
                  Availability:{' '}
                  <span className={`badge ${combo.isAvailable ? 'available' : 'sold'}`}>
                    {combo.isAvailable ? 'ready' : 'unavailable'}
                  </span>
                </p>
              </div>
              <div className="btn-col">
                <button type="button" onClick={() => onToggleComboActive(combo)}>
                  {combo.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button type="button" onClick={() => onEditCombo(combo)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => onDeleteCombo(combo.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default AdminCombosTab
