function AdminTestimonialsTab({
  testimonialForm,
  testimonials,
  onChangeTestimonial,
  onSubmitTestimonial,
  onToggleTestimonialFeatured,
  onToggleTestimonialVisibility,
}) {
  return (
    <section className="admin-tab-panel">
      <form className="admin-form" onSubmit={onSubmitTestimonial}>
        <h3>Testimonials</h3>
        <label>
          Name
          <input name="name" value={testimonialForm.name} onChange={onChangeTestimonial} required />
        </label>
        <label>
          Content
          <textarea name="content" value={testimonialForm.content} onChange={onChangeTestimonial} required />
        </label>
        <label>
          Rating
          <input name="rating" type="number" min="1" max="5" value={testimonialForm.rating} onChange={onChangeTestimonial} />
        </label>
        <label>
          Artwork ID
          <input
            name="artwork_id"
            type="number"
            min="1"
            value={testimonialForm.artwork_id}
            onChange={onChangeTestimonial}
          />
        </label>
        <label>
          <input
            name="is_featured"
            type="checkbox"
            checked={testimonialForm.is_featured}
            onChange={onChangeTestimonial}
          />
          Featured
        </label>
        <div className="btn-row">
          <button type="submit">Add Testimonial</button>
        </div>
      </form>

      <div className="admin-list">
        {testimonials.length === 0 ? (
          <p>No testimonials yet.</p>
        ) : (
          testimonials.map((testimonial) => (
            <article key={testimonial.id} className="admin-item order-item admin-item--compact">
              <div>
                <h3>{testimonial.name}</h3>
                <p>{testimonial.content}</p>
                <p>Rating: {testimonial.rating || 'Not provided'}</p>
                <p>Artwork ID: {testimonial.artwork_id || 'Not linked'}</p>
                <p>
                  Featured:{' '}
                  <span className={`badge ${testimonial.is_featured ? 'available' : 'sold'}`}>
                    {testimonial.is_featured ? 'yes' : 'no'}
                  </span>
                </p>
                <p>
                  Visible:{' '}
                  <span className={`badge ${testimonial.is_visible ? 'available' : 'sold'}`}>
                    {testimonial.is_visible ? 'yes' : 'no'}
                  </span>
                </p>
              </div>
              <div className="btn-col">
                <button type="button" onClick={() => onToggleTestimonialFeatured(testimonial)}>
                  {testimonial.is_featured ? 'Unfeature' : 'Feature'}
                </button>
                <button type="button" onClick={() => onToggleTestimonialVisibility(testimonial)}>
                  {testimonial.is_visible ? 'Hide' : 'Show'}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default AdminTestimonialsTab
