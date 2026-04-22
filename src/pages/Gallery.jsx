import { useEffect, useMemo, useState } from 'react'
import { fetchArtworks } from '../services/artworkService'
import Reveal from '../components/Reveal'
import StoreCard from '../components/StoreCard'
import ErrorState from '../components/ErrorState'
import { SkeletonGrid } from '../components/SkeletonLoader'
import usePageMeta from '../hooks/usePageMeta'
import { getUserFriendlyError } from '../utils/userErrors'

const ALL_CATEGORIES = 'all'
const DEFAULT_SORT = 'featured'

function sortArtworks(artworks, sortBy) {
  const sortedArtworks = [...artworks]

  switch (sortBy) {
    case 'price-low-high':
      return sortedArtworks.sort((left, right) => left.price - right.price)
    case 'price-high-low':
      return sortedArtworks.sort((left, right) => right.price - left.price)
    case 'title-a-z':
      return sortedArtworks.sort((left, right) => left.title.localeCompare(right.title))
    case 'newest':
      return sortedArtworks.sort((left, right) => Number(right.id) - Number(left.id))
    case 'featured':
    default:
      return sortedArtworks
  }
}

function formatCategoryLabel(category) {
  if (!category) {
    return 'Uncategorized'
  }

  return category.charAt(0).toUpperCase() + category.slice(1)
}

function Gallery() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState(DEFAULT_SORT)
  const [retryKey, setRetryKey] = useState(0)

  usePageMeta({
    title: 'Gallery | Archiverse',
    description: 'Browse curated artworks available at Archiverse.',
  })

  useEffect(() => {
    async function loadArtworks() {
      setLoading(true)
      try {
        const response = await fetchArtworks()
        setArtworks(response)
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(
          getUserFriendlyError(error, 'We could not load the store right now.'),
        )
      } finally {
        setLoading(false)
      }
    }

    loadArtworks()
  }, [retryKey])

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        artworks
          .map((artwork) => String(artwork.category || '').trim().toLowerCase())
          .filter(Boolean),
      ),
    )

    return uniqueCategories.sort((left, right) => left.localeCompare(right))
  }, [artworks])

  const invalidPriceRange =
    minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice)

  const filteredArtworks = useMemo(() => {
    const parsedMinPrice = minPrice === '' ? null : Number(minPrice)
    const parsedMaxPrice = maxPrice === '' ? null : Number(maxPrice)

    if (parsedMinPrice !== null && parsedMaxPrice !== null && parsedMinPrice > parsedMaxPrice) {
      return []
    }

    const matchingArtworks = artworks.filter((artwork) => {
      const matchesCategory =
        selectedCategory === ALL_CATEGORIES || artwork.category === selectedCategory
      const matchesMinPrice = parsedMinPrice === null || artwork.price >= parsedMinPrice
      const matchesMaxPrice = parsedMaxPrice === null || artwork.price <= parsedMaxPrice

      return matchesCategory && matchesMinPrice && matchesMaxPrice
    })

    return sortArtworks(matchingArtworks, sortBy)
  }, [artworks, maxPrice, minPrice, selectedCategory, sortBy])

  if (loading) {
    return (
      <section className="page-flow page-with-header-gap">
        <Reveal className="portfolio-header">
          <p className="eyebrow">STORE</p>
          <p className="store-tagline">ORIGINAL WORKS AVAILABLE FOR COLLECTION.</p>
        </Reveal>
        <SkeletonGrid className="store-grid" count={6} />
      </section>
    )
  }

  if (errorMessage) {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={() => setRetryKey((value) => value + 1)}
      />
    )
  }

  if (artworks.length === 0) {
    return <p className="status-message">No artworks found.</p>
  }

  return (
    <section className="page-flow page-with-header-gap">
      <Reveal className="portfolio-header">
        <p className="eyebrow">STORE</p>
        <p className="store-tagline">ORIGINAL WORKS AVAILABLE FOR COLLECTION.</p>
      </Reveal>
      <div className="store-filters" aria-label="Store filters">
        <label className="store-filter-field">
          <span>Category</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value={ALL_CATEGORIES}>All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {formatCategoryLabel(category)}
              </option>
            ))}
          </select>
        </label>

        <label className="store-filter-field">
          <span>Min price</span>
          <input
            type="number"
            min="0"
            step="200"
            inputMode="numeric"
            placeholder="No minimum"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
          />
        </label>

        <label className="store-filter-field">
          <span>Max price</span>
          <input
            type="number"
            min="0"
            step="200"
            inputMode="numeric"
            placeholder="No maximum"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
          />
        </label>

        <label className="store-filter-field">
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value={DEFAULT_SORT}>Featured</option>
            <option value="newest">Newest</option>
            <option value="price-low-high">Price: Low to high</option>
            <option value="price-high-low">Price: High to low</option>
            <option value="title-a-z">Title: A to Z</option>
          </select>
        </label>
      </div>

      {invalidPriceRange ? (
        <p className="status-message error">Minimum price cannot be greater than maximum price.</p>
      ) : null}

      <p className="store-results-count">
        Showing {filteredArtworks.length} of {artworks.length} artworks
      </p>

      {invalidPriceRange ? null : filteredArtworks.length === 0 ? (
        <p className="status-message">No artworks match the selected filters.</p>
      ) : (
        <div className="store-grid artwork-grid">
          {filteredArtworks.map((artwork) => (
            <StoreCard key={artwork.id} artwork={artwork} />
          ))}
        </div>
      )}
    </section>
  )
}

export default Gallery
