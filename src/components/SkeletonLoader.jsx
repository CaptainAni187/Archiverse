function SkeletonCard() {
  return (
    <article className="skeleton-card" aria-hidden="true">
      <div className="skeleton-block skeleton-media" />
      <div className="skeleton-copy">
        <div className="skeleton-block skeleton-line skeleton-line-title" />
        <div className="skeleton-block skeleton-line skeleton-line-meta" />
      </div>
    </article>
  )
}

export function SkeletonGrid({ count = 6, className = 'store-grid' }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}

export function SkeletonMasonry({ count = 5 }) {
  return (
    <div className="feed-masonry" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`feed-brick feed-brick-${(index % 4) + 1} skeleton-block skeleton-masonry-item`}
        />
      ))}
    </div>
  )
}

export function SkeletonProduct() {
  return (
    <div className="product-layout" aria-hidden="true">
      <div className="product-gallery">
        <div className="skeleton-block skeleton-product-image" />
        <div className="thumbnail-row">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-block skeleton-thumb" />
          ))}
        </div>
      </div>
      <div className="product-copy">
        <div className="skeleton-block skeleton-line skeleton-line-kicker" />
        <div className="skeleton-block skeleton-line skeleton-line-heading" />
        <div className="skeleton-block skeleton-line skeleton-line-price" />
        <div className="skeleton-block skeleton-line skeleton-line-meta" />
        <div className="skeleton-block skeleton-line skeleton-line-meta" />
        <div className="skeleton-block skeleton-line skeleton-line-body" />
        <div className="skeleton-block skeleton-line skeleton-line-body" />
        <div className="skeleton-block skeleton-button" />
      </div>
    </div>
  )
}

export function SkeletonAccount() {
  return (
    <section className="order-detail-card" aria-hidden="true">
      <div className="order-detail-header">
        <div className="skeleton-copy">
          <div className="skeleton-block skeleton-line skeleton-line-kicker" />
          <div className="skeleton-block skeleton-line skeleton-line-heading" />
          <div className="skeleton-block skeleton-line skeleton-line-meta" />
        </div>
        <div className="skeleton-block skeleton-button skeleton-button-small" />
      </div>
      <div className="admin-list">
        {Array.from({ length: 2 }, (_, index) => (
          <article key={index} className="admin-item order-item skeleton-card">
            <div className="skeleton-copy">
              <div className="skeleton-block skeleton-line skeleton-line-title" />
              <div className="skeleton-block skeleton-line skeleton-line-meta" />
              <div className="skeleton-block skeleton-line skeleton-line-meta" />
            </div>
            <div className="skeleton-block skeleton-button skeleton-button-small" />
          </article>
        ))}
      </div>
    </section>
  )
}
