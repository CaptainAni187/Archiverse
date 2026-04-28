import { useEffect, useMemo, useState } from 'react'
import { fetchArtworks } from '../services/artworkService'
import Reveal from '../components/Reveal'
import StoreCard from '../components/StoreCard'
import ErrorState from '../components/ErrorState'
import { SkeletonGrid } from '../components/SkeletonLoader'
import usePageMeta from '../hooks/usePageMeta'
import { getUserFriendlyError } from '../utils/userErrors'
import {
  getTasteProfile,
  hasTasteSignals,
  rankArtworksByTaste,
} from '../services/tasteService'
import { trackAnalyticsEvent } from '../services/analyticsService'
import SmartSearchPanel from '../components/SmartSearchPanel'
import { runSmartArtworkSearch } from '../services/smartSearchService'

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
  const [smartQuery, setSmartQuery] = useState('')
  const [selectedMoods, setSelectedMoods] = useState([])
  const [smartResults, setSmartResults] = useState([])
  const [smartSummary, setSmartSummary] = useState('')
  const [smartSource, setSmartSource] = useState('')
  const [isSmartSearching, setIsSmartSearching] = useState(false)

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

  useEffect(() => {
    if (loading) {
      return
    }

    if (
      selectedCategory === ALL_CATEGORIES &&
      minPrice === '' &&
      maxPrice === '' &&
      sortBy === DEFAULT_SORT
    ) {
      return
    }

    void trackAnalyticsEvent('search_query', {
      query: [selectedCategory, minPrice, maxPrice, sortBy].filter(Boolean).join(' '),
      category: selectedCategory === ALL_CATEGORIES ? '' : selectedCategory,
      min_price: minPrice === '' ? null : Number(minPrice),
      max_price: maxPrice === '' ? null : Number(maxPrice),
      sort_by: sortBy,
    })
  }, [loading, maxPrice, minPrice, selectedCategory, sortBy])

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
  const hasSmartSearch = Boolean(smartQuery.trim() || selectedMoods.length > 0)

  const filteredArtworks = useMemo(() => {
    const parsedMinPrice = minPrice === '' ? null : Number(minPrice)
    const parsedMaxPrice = maxPrice === '' ? null : Number(maxPrice)

    if (parsedMinPrice !== null && parsedMaxPrice !== null && parsedMinPrice > parsedMaxPrice) {
      return []
    }

    const smartResultById = new Map(
      smartResults.map((result) => [
        Number(result.artwork?.id),
        {
          explanation: result.explanation,
          score: result.score,
          source: result.source,
        },
      ]),
    )
    const sourceArtworks = hasSmartSearch
      ? smartResults.map((result) => result.artwork).filter(Boolean)
      : artworks

    const matchingArtworks = sourceArtworks.map((artwork) => ({
      ...artwork,
      smart_explanation: smartResultById.get(Number(artwork.id))?.explanation || '',
      smart_score: smartResultById.get(Number(artwork.id))?.score || 0,
      smart_source: smartResultById.get(Number(artwork.id))?.source || '',
    })).filter((artwork) => {
      const matchesCategory =
        selectedCategory === ALL_CATEGORIES || artwork.category === selectedCategory
      const matchesMinPrice = parsedMinPrice === null || artwork.price >= parsedMinPrice
      const matchesMaxPrice = parsedMaxPrice === null || artwork.price <= parsedMaxPrice

      return matchesCategory && matchesMinPrice && matchesMaxPrice
    })

    if (hasSmartSearch) {
      return matchingArtworks
    }

    if (sortBy === DEFAULT_SORT && hasTasteSignals(getTasteProfile())) {
      return rankArtworksByTaste(matchingArtworks, getTasteProfile())
    }

    return sortArtworks(matchingArtworks, sortBy)
  }, [artworks, hasSmartSearch, maxPrice, minPrice, selectedCategory, smartResults, sortBy])

  useEffect(() => {
    if (!hasSmartSearch) {
      setSmartResults([])
      setSmartSummary('')
      setSmartSource('')
      return undefined
    }

    let isCancelled = false
    const searchTimer = window.setTimeout(async () => {
      setIsSmartSearching(true)
      const response = await runSmartArtworkSearch({
        query: smartQuery,
        moods: selectedMoods,
        artworks,
      })

      if (!isCancelled) {
        setSmartResults(response.results)
        setSmartSummary(response.summary)
        setSmartSource(response.source)
        setIsSmartSearching(false)
      }
    }, 250)

    return () => {
      isCancelled = true
      window.clearTimeout(searchTimer)
    }
  }, [artworks, hasSmartSearch, selectedMoods, smartQuery])

  const toggleMood = (mood) => {
    setSelectedMoods((current) =>
      current.includes(mood)
        ? current.filter((item) => item !== mood)
        : [...current, mood],
    )
  }

  const clearSmartSearch = () => {
    setSmartQuery('')
    setSelectedMoods([])
    setSmartResults([])
    setSmartSummary('')
    setSmartSource('')
  }

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
      <SmartSearchPanel
        query={smartQuery}
        moods={selectedMoods}
        summary={smartSummary}
        source={smartSource}
        isSearching={isSmartSearching}
        onQueryChange={setSmartQuery}
        onMoodToggle={toggleMood}
        onSubmit={(event) => event.preventDefault()}
        onClear={clearSmartSearch}
      />
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
