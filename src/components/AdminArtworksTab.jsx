function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString()}`
}

function AdminArtworksTab({
  form,
  editingId,
  artworkFilter,
  filteredArtworks,
  adminArtworkPreviews,
  onChange,
  onToggleFeaturedField,
  onSubmit,
  onCancelEdit,
  onSetArtworkFilter,
  onChangeArtworkStatus,
  onEditArtwork,
  onDeleteArtwork,
  onToggleArtworkFeatured,
}) {
  return (
    <section className="admin-tab-panel">
      <form className="admin-form" onSubmit={onSubmit}>
        <label>
          Image URL 1
          <input name="image1" value={form.image1} onChange={onChange} required />
        </label>
        <label>
          Image URL 2
          <input name="image2" value={form.image2} onChange={onChange} />
        </label>
        <label>
          Image URL 3
          <input name="image3" value={form.image3} onChange={onChange} />
        </label>
        <label>
          Image URL 4
          <input name="image4" value={form.image4} onChange={onChange} />
        </label>
        <label>
          Image URL 5
          <input name="image5" value={form.image5} onChange={onChange} />
        </label>
        <label>
          Title
          <input name="title" value={form.title} onChange={onChange} required />
        </label>
        <label>
          Price
          <input name="price" type="number" min="1" value={form.price} onChange={onChange} required />
        </label>
        <label>
          Description
          <textarea name="description" value={form.description} onChange={onChange} required />
        </label>
        <label>
          Medium
          <input name="medium" value={form.medium} onChange={onChange} required />
        </label>
        <label>
          Size
          <input name="size" value={form.size} onChange={onChange} required />
        </label>
        <label>
          <input
            type="checkbox"
            name="is_featured"
            checked={form.is_featured}
            onChange={onToggleFeaturedField}
          />
          Featured on homepage
        </label>
        <label>
          Quantity
          <input
            name="quantity"
            type="number"
            min="0"
            step="1"
            value={form.quantity}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Status
          <select name="status" value={form.status} onChange={onChange}>
            <option value="available">available</option>
            <option value="sold">sold</option>
          </select>
        </label>
        <label>
          Category
          <select name="category" value={form.category} onChange={onChange}>
            <option value="canvas">canvas</option>
            <option value="sketch">sketch</option>
          </select>
        </label>
        <div className="btn-row">
          <button type="submit">{editingId ? 'Update Artwork' : 'Add Artwork'}</button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={onCancelEdit}>
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="filter-row">
        <span>Artwork filter:</span>
        <button
          type="button"
          className={artworkFilter === 'all' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => onSetArtworkFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={artworkFilter === 'available' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => onSetArtworkFilter('available')}
        >
          Available
        </button>
        <button
          type="button"
          className={artworkFilter === 'sold' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => onSetArtworkFilter('sold')}
        >
          Sold
        </button>
      </div>

      <div className="admin-list">
        {filteredArtworks.length === 0 ? (
          <p className="status-message">No artworks found.</p>
        ) : (
          filteredArtworks.map((artwork) => (
            <article key={artwork.id} className="admin-item">
              {adminArtworkPreviews.get(artwork.id) ? (
                <img
                  src={adminArtworkPreviews.get(artwork.id)}
                  alt={artwork.title}
                  loading="lazy"
                  decoding="async"
                  width="400"
                  height="400"
                />
              ) : null}
              <div>
                <h3>{artwork.title}</h3>
                <p>{formatPrice(artwork.price)}</p>
                <p>Medium: {artwork.medium}</p>
                <p>Size: {artwork.size}</p>
                <p>Stock: {artwork.quantity}</p>
                <p>Category: {artwork.category || 'canvas'}</p>
                <p>
                  Status:{' '}
                  <span className={`badge ${artwork.status === 'sold' ? 'sold' : 'available'}`}>
                    {artwork.status || 'available'}
                  </span>
                </p>
                <p>
                  Featured:{' '}
                  <span className={`badge ${artwork.is_featured ? 'available' : 'sold'}`}>
                    {artwork.is_featured ? 'yes' : 'no'}
                  </span>
                </p>
              </div>
              <div className="btn-col">
                <select
                  value={artwork.status || 'available'}
                  onChange={(event) => onChangeArtworkStatus(artwork.id, event.target.value)}
                >
                  <option value="available">available</option>
                  <option value="sold">sold</option>
                </select>
                <button type="button" onClick={() => onToggleArtworkFeatured(artwork)}>
                  {artwork.is_featured ? 'Unfeature' : 'Feature'}
                </button>
                <button type="button" onClick={() => onEditArtwork(artwork)}>
                  Edit
                </button>
                <button type="button" className="btn-danger" onClick={() => onDeleteArtwork(artwork.id)}>
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

export default AdminArtworksTab
