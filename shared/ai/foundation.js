export const SUPPORTED_BEHAVIOR_EVENTS = [
  'artwork_view',
  'artwork_click',
  'product_open',
  'instagram_click',
  'commission_open',
  'search_query',
  'checkout_started',
  'order_completed',
]

const EVENT_WEIGHTS = {
  artwork_view: 1,
  artwork_click: 2,
  product_open: 3,
  instagram_click: 2,
  commission_open: 2,
  search_query: 1.5,
  checkout_started: 2.5,
  order_completed: 4,
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return []
  }

  return tags
    .map((tag) => normalizeText(tag))
    .filter((tag, index, collection) => tag && collection.indexOf(tag) === index)
}

export function tokenizeText(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean)
}

export function buildArtworkSignals(artwork = {}) {
  const category = normalizeText(artwork.category)
  const tags = normalizeTags(artwork.tags)
  const textTokens = [
    ...tokenizeText(artwork.title),
    ...tokenizeText(artwork.medium),
    ...tokenizeText(artwork.description),
  ]

  return {
    category,
    tags,
    textTokens: textTokens.filter(
      (token, index, collection) => collection.indexOf(token) === index,
    ),
  }
}

export function createEmptyTasteProfile() {
  return {
    event_counts: {},
    category_weights: {},
    tag_weights: {},
    artwork_weights: {},
    price_preference: {
      min: null,
      max: null,
      average: null,
      total_weight: 0,
    },
    search_terms: {},
    last_event_type: null,
    last_updated_at: null,
  }
}

function incrementWeight(bucket, key, weight) {
  if (!key) {
    return bucket
  }

  return {
    ...bucket,
    [key]: normalizeNumber(bucket[key]) + weight,
  }
}

export function mergeTasteProfileForEvent(currentProfile = {}, event = {}) {
  const baseProfile = {
    ...createEmptyTasteProfile(),
    ...currentProfile,
    price_preference: {
      ...createEmptyTasteProfile().price_preference,
      ...(currentProfile.price_preference || {}),
    },
  }
  const eventType = normalizeText(event.event_type)
  const metadata = event.metadata || {}
  const dwellWeight = Math.min(3, normalizeNumber(metadata.dwell_time_ms) / 15000)
  const hoverWeight = Math.min(2, normalizeNumber(metadata.hover_dwell_time_ms) / 10000)
  const weight = (EVENT_WEIGHTS[eventType] || 1) + dwellWeight + hoverWeight
  const artworkSignals = buildArtworkSignals(metadata.artwork || metadata)
  const category = artworkSignals.category || normalizeText(metadata.category)
  const tags = artworkSignals.tags.length > 0 ? artworkSignals.tags : normalizeTags(metadata.tags)
  const queryTokens = tokenizeText(metadata.query)
  const artworkId = metadata.artwork_id || metadata.id || metadata.artwork?.id || null
  const price = normalizeNumber(metadata.price ?? metadata.artwork?.price, null)

  const nextProfile = {
    ...baseProfile,
    event_counts: incrementWeight(baseProfile.event_counts, eventType, 1),
    category_weights: category
      ? incrementWeight(baseProfile.category_weights, category, weight)
      : { ...baseProfile.category_weights },
    tag_weights: { ...baseProfile.tag_weights },
    artwork_weights: { ...baseProfile.artwork_weights },
    price_preference: { ...baseProfile.price_preference },
    search_terms: { ...baseProfile.search_terms },
    last_event_type: eventType || baseProfile.last_event_type,
    last_updated_at: event.timestamp || new Date().toISOString(),
  }

  if (artworkId != null) {
    nextProfile.artwork_weights = incrementWeight(
      nextProfile.artwork_weights,
      String(artworkId),
      weight,
    )
  }

  if (Number.isFinite(price)) {
    const previousTotalWeight = normalizeNumber(nextProfile.price_preference.total_weight)
    const nextTotalWeight = previousTotalWeight + weight
    const previousAverage =
      nextProfile.price_preference.average == null
        ? price
        : normalizeNumber(nextProfile.price_preference.average, price)

    nextProfile.price_preference = {
      min:
        nextProfile.price_preference.min == null
          ? price
          : Math.min(normalizeNumber(nextProfile.price_preference.min, price), price),
      max:
        nextProfile.price_preference.max == null
          ? price
          : Math.max(normalizeNumber(nextProfile.price_preference.max, price), price),
      average: Number(
        (((previousAverage * previousTotalWeight) + (price * weight)) / nextTotalWeight).toFixed(2),
      ),
      total_weight: Number(nextTotalWeight.toFixed(3)),
    }
  }

  tags.forEach((tag) => {
    nextProfile.tag_weights = incrementWeight(nextProfile.tag_weights, tag, weight)
  })

  queryTokens.forEach((token) => {
    nextProfile.search_terms = incrementWeight(nextProfile.search_terms, token, weight)
  })

  return nextProfile
}

export function scoreArtworkForTaste(artwork = {}, tasteProfile = {}, options = {}) {
  const profile = {
    ...createEmptyTasteProfile(),
    ...tasteProfile,
    price_preference: {
      ...createEmptyTasteProfile().price_preference,
      ...(tasteProfile.price_preference || {}),
    },
  }
  const artworkSignals = buildArtworkSignals(artwork)
  let score = 0

  if (artworkSignals.category) {
    score += normalizeNumber(profile.category_weights?.[artworkSignals.category])
  }

  artworkSignals.tags.forEach((tag) => {
    score += normalizeNumber(profile.tag_weights?.[tag])
  })

  artworkSignals.textTokens.forEach((token) => {
    score += normalizeNumber(profile.search_terms?.[token], 0) * 0.35
  })

  const artworkWeight = normalizeNumber(profile.artwork_weights?.[String(artwork.id)])
  score += artworkWeight * 1.15

  const artworkPrice = normalizeNumber(artwork.price, null)
  const preferredPrice = normalizeNumber(profile.price_preference?.average, null)
  if (Number.isFinite(artworkPrice) && Number.isFinite(preferredPrice) && preferredPrice > 0) {
    const proximity = 1 - Math.min(1, Math.abs(artworkPrice - preferredPrice) / preferredPrice)
    score += proximity * 2
  }

  const interactedAt = Date.parse(options.now || new Date().toISOString())
  const updatedAt = Date.parse(profile.last_updated_at || '')
  if (Number.isFinite(interactedAt) && Number.isFinite(updatedAt)) {
    const daysSinceInteraction = Math.max(0, (interactedAt - updatedAt) / 86400000)
    score += Math.max(0, 1.5 - daysSinceInteraction * 0.1)
  }

  if (artwork.is_featured === true) {
    score += 0.5
  }

  if (Number.isFinite(Number(artwork.featured_rank))) {
    score += Math.max(0, 10 - Number(artwork.featured_rank)) * 0.1
  }

  return Number(score.toFixed(3))
}

export function rankArtworksForTaste(artworks = [], tasteProfile = {}) {
  return [...artworks]
    .map((artwork) => ({
      ...artwork,
      ai_score: scoreArtworkForTaste(artwork, tasteProfile),
    }))
    .sort((left, right) => right.ai_score - left.ai_score)
}

export function explainArtworkRecommendation(artwork = {}, tasteProfile = {}) {
  const profile = {
    ...createEmptyTasteProfile(),
    ...tasteProfile,
    price_preference: {
      ...createEmptyTasteProfile().price_preference,
      ...(tasteProfile.price_preference || {}),
    },
  }
  const signals = buildArtworkSignals(artwork)
  const reasons = []
  const matchingTags = signals.tags.filter((tag) => normalizeNumber(profile.tag_weights?.[tag]) > 0)
  const categoryWeight = normalizeNumber(profile.category_weights?.[signals.category])
  const artworkPrice = normalizeNumber(artwork.price, null)
  const preferredPrice = normalizeNumber(profile.price_preference?.average, null)
  const repeatedWeight = normalizeNumber(profile.artwork_weights?.[String(artwork.id)])

  if (matchingTags.length > 0) {
    reasons.push(`matches your interest in ${matchingTags.slice(0, 3).join(', ')}`)
  }

  if (signals.category && categoryWeight > 0) {
    reasons.push(`fits your ${signals.category} browsing`)
  }

  if (Number.isFinite(artworkPrice) && Number.isFinite(preferredPrice) && preferredPrice > 0) {
    const proximity = 1 - Math.min(1, Math.abs(artworkPrice - preferredPrice) / preferredPrice)
    if (proximity >= 0.65) {
      reasons.push('is close to your viewed price range')
    }
  }

  if (repeatedWeight > 1) {
    reasons.push('reflects repeated interaction')
  }

  if (profile.last_updated_at) {
    reasons.push('uses your recent activity')
  }

  return reasons.length > 0
    ? `Shown because it ${reasons.slice(0, 3).join(', ')}.`
    : 'Shown from your recent browsing signals. Explore more works to improve recommendations.'
}

export function buildRecommendationSet(artworks = [], tasteProfile = {}, limit = 6) {
  return rankArtworksForTaste(artworks, tasteProfile).slice(0, Math.max(1, Number(limit) || 6))
}

export function parseCommissionIntent(input = '') {
  const tokens = tokenizeText(input)
  const joined = normalizeText(input)

  return {
    category:
      tokens.includes('sketch') || tokens.includes('pencil')
        ? 'sketch'
        : tokens.includes('canvas') || tokens.includes('acrylic')
          ? 'canvas'
          : '',
    style_keywords: normalizeTags(
      ['minimal', 'modern', 'portrait', 'abstract', 'botanical', 'textured'].filter((keyword) =>
        joined.includes(keyword),
      ),
    ),
    size_hints: normalizeTags(
      ['small', 'medium', 'large', 'wall', 'square', 'vertical', 'horizontal'].filter((keyword) =>
        joined.includes(keyword),
      ),
    ),
    extracted_tokens: tokens,
  }
}

export function buildCommissionPrompt({ request = '', tasteProfile = {}, recentArtworks = [] } = {}) {
  return [
    'You are a local Archiverse assistant running through Ollama.',
    'Summarize the commission request, infer likely category/style/size, and keep the tone practical.',
    `Request: ${request || 'No request provided.'}`,
    `Taste profile: ${JSON.stringify(tasteProfile)}`,
    `Recent artworks: ${JSON.stringify(recentArtworks.slice(0, 5))}`,
  ].join('\n')
}

export function buildAdminSuggestionPrompt({
  query = '',
  tasteProfile = {},
  topArtworks = [],
  recentEvents = [],
} = {}) {
  return [
    'You are a local Archiverse admin assistant running through Ollama.',
    'Suggest relevant artworks, tags, or featured ordering changes using only the supplied context.',
    `Admin query: ${query || 'No query provided.'}`,
    `Taste profile: ${JSON.stringify(tasteProfile)}`,
    `Top artworks: ${JSON.stringify(topArtworks.slice(0, 8))}`,
    `Recent events: ${JSON.stringify(recentEvents.slice(0, 12))}`,
  ].join('\n')
}

function findMatchingKeywords(text, keywords) {
  return keywords.filter((keyword) => text.includes(keyword))
}

function chooseFirstMatch(text, options, fallback) {
  const match = options.find((option) => option.keywords.some((keyword) => text.includes(keyword)))
  return match?.label || fallback
}

export function parseCommissionBrief(input = '', context = {}) {
  const normalized = normalizeText(input)
  const tokens = tokenizeText(input)
  const artworkType = normalizeText(context.artwork_type)
  const requestedSize = normalizeText(context.size)
  const deadline = context.deadline ? new Date(context.deadline) : null
  const today = new Date()
  const daysUntilDeadline =
    deadline && Number.isFinite(deadline.getTime())
      ? Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
      : null
  const moodKeywords = findMatchingKeywords(normalized, [
    'calm',
    'peaceful',
    'soft',
    'bold',
    'spiritual',
    'minimal',
    'modern',
    'warm',
    'dark',
    'bright',
    'anime',
    'romantic',
    'dreamy',
  ])
  const themeKeywords = findMatchingKeywords(normalized, [
    'mother',
    'mom',
    'family',
    'love',
    'home',
    'portrait',
    'couple',
    'god',
    'spiritual',
    'nature',
    'flower',
    'anime',
    'memory',
    'gift',
    'room',
    'wall',
  ])
  const style = chooseFirstMatch(
    normalized,
    [
      { label: 'minimal modern', keywords: ['minimal', 'simple', 'clean', 'modern'] },
      { label: 'bold expressive', keywords: ['bold', 'dramatic', 'strong', 'vibrant'] },
      { label: 'spiritual symbolic', keywords: ['spiritual', 'god', 'divine', 'sacred'] },
      { label: 'anime inspired', keywords: ['anime', 'manga', 'character'] },
      { label: 'personal portrait', keywords: ['portrait', 'face', 'person', 'couple'] },
    ],
    artworkType === 'sketch' ? 'sketch study' : 'custom acrylic artwork',
  )
  const mood = moodKeywords.length > 0 ? moodKeywords.slice(0, 3).join(', ') : 'personal'
  const mediumSuggestion =
    artworkType === 'sketch' || normalized.includes('pencil') || normalized.includes('graphite')
      ? 'graphite or charcoal on paper'
      : 'acrylic on canvas'
  const sizeSuggestion =
    requestedSize ||
    chooseFirstMatch(
      normalized,
      [
        { label: 'small format', keywords: ['small', 'desk', 'compact'] },
        { label: 'medium wall piece', keywords: ['medium', 'room', 'wall'] },
        { label: 'large statement piece', keywords: ['large', 'big', 'statement'] },
      ],
      'medium wall piece',
    )
  const deadlineUrgency =
    daysUntilDeadline == null
      ? 'timeline not specified'
      : daysUntilDeadline <= 7
        ? 'urgent'
        : daysUntilDeadline <= 21
          ? 'moderate'
          : 'flexible'
  const cleanKeywords = [...new Set([...themeKeywords, ...tokens.slice(0, 8)])].slice(0, 10)
  const clearerBrief = [
    `Create a ${style} ${mediumSuggestion}`,
    `Mood: ${mood}`,
    `Suggested size: ${sizeSuggestion}`,
    cleanKeywords.length > 0 ? `Themes: ${cleanKeywords.join(', ')}` : '',
  ].filter(Boolean).join('. ')
  const suggestedReply = [
    'Thank you for sharing your commission idea.',
    `I can shape this into a ${style} piece with a ${mood} feeling.`,
    'I will review the references, confirm size and timeline, then share the next steps.',
  ].join(' ')

  return {
    style,
    mood,
    medium_suggestion: mediumSuggestion,
    size_suggestion: sizeSuggestion,
    deadline_urgency: deadlineUrgency,
    theme_keywords: cleanKeywords,
    clearer_brief: clearerBrief,
    suggested_reply: suggestedReply,
    parser: 'local-rules',
  }
}

export const SMART_SEARCH_MOODS = ['calm', 'bold', 'spiritual', 'minimal', 'gift', 'anime']

const MOOD_KEYWORDS = {
  calm: ['calm', 'quiet', 'soft', 'peaceful', 'gentle', 'serene', 'minimal'],
  bold: ['bold', 'strong', 'dramatic', 'contrast', 'vivid', 'statement'],
  spiritual: ['spiritual', 'soul', 'divine', 'ritual', 'sacred', 'meditative'],
  minimal: ['minimal', 'simple', 'clean', 'modern', 'neutral', 'subtle'],
  gift: ['gift', 'mom', 'mother', 'friend', 'personal', 'warm', 'home'],
  anime: ['anime', 'manga', 'character', 'figure', 'portrait', 'sketch'],
}

export function createArtworkSearchDocument(artwork = {}) {
  const tags = normalizeTags(artwork.tags)
  return [
    artwork.title,
    artwork.description,
    artwork.medium,
    artwork.size,
    artwork.category,
    tags.join(' '),
    Number.isFinite(Number(artwork.price)) ? `price ${Number(artwork.price)}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function getSmartSearchTerms(query = '', moods = []) {
  const moodTerms = moods.flatMap((mood) => MOOD_KEYWORDS[normalizeText(mood)] || [])
  return [...tokenizeText(query), ...moodTerms].filter(
    (term, index, collection) => collection.indexOf(term) === index,
  )
}

function inferBudgetTerms(query = '') {
  const normalizedQuery = normalizeText(query)
  const numbers = normalizedQuery.match(/\d+/g)?.map(Number).filter(Number.isFinite) || []

  return {
    wantsGift: normalizedQuery.includes('gift'),
    wantsAffordable:
      normalizedQuery.includes('affordable') ||
      normalizedQuery.includes('budget') ||
      normalizedQuery.includes('cheap'),
    targetPrice: numbers.length > 0 ? Math.max(...numbers) : null,
  }
}

export function scoreArtworkForSearch(artwork = {}, query = '', moods = []) {
  const terms = getSmartSearchTerms(query, moods)
  const documentTokens = tokenizeText(createArtworkSearchDocument(artwork))
  const signals = buildArtworkSignals(artwork)
  const budget = inferBudgetTerms(query)
  const price = normalizeNumber(artwork.price, null)
  let keywordScore = 0
  let tagScore = 0
  let categoryScore = 0
  let priceScore = 0
  const matchedTerms = []

  terms.forEach((term) => {
    if (documentTokens.includes(term)) {
      keywordScore += 3
      matchedTerms.push(term)
      return
    }

    if (documentTokens.some((token) => token.includes(term) || term.includes(token))) {
      keywordScore += 1.2
      matchedTerms.push(term)
    }
  })

  moods.forEach((mood) => {
    const normalizedMood = normalizeText(mood)
    const moodKeywords = MOOD_KEYWORDS[normalizedMood] || []
    const hasMoodMatch =
      signals.tags.some((tag) => moodKeywords.includes(tag)) ||
      moodKeywords.some((keyword) => documentTokens.includes(keyword))

    if (hasMoodMatch) {
      tagScore += 2.5
      matchedTerms.push(normalizedMood)
    }
  })

  const normalizedQuery = normalizeText(query)
  if (
    signals.category &&
    (documentTokens.includes(signals.category) ||
      normalizedQuery.includes(signals.category) ||
      terms.includes(signals.category))
  ) {
    categoryScore += 0
  }

  if (budget.wantsGift && Number.isFinite(price)) {
    priceScore += price <= 5000 ? 1.5 : 0.5
  }

  if (budget.wantsAffordable && Number.isFinite(price)) {
    priceScore += price <= 4000 ? 2 : 0
  }

  if (Number.isFinite(budget.targetPrice) && Number.isFinite(price) && budget.targetPrice > 0) {
    const proximity = 1 - Math.min(1, Math.abs(price - budget.targetPrice) / budget.targetPrice)
    priceScore += proximity * 2
  }

  if (artwork.is_featured === true) {
    keywordScore += 0.25
  }

  const finalScore = keywordScore + tagScore + categoryScore + priceScore

  return {
    score: Number(finalScore.toFixed(3)),
    matchedTerms: matchedTerms.filter(
      (term, index, collection) => term && collection.indexOf(term) === index,
    ),
  }
}

export function getSearchScoreBreakdown(artwork = {}, query = '', moods = []) {
  const { score, matchedTerms } = scoreArtworkForSearch(artwork, query, moods)

  const terms = getSmartSearchTerms(query, moods)
  const documentTokens = tokenizeText(createArtworkSearchDocument(artwork))
  const signals = buildArtworkSignals(artwork)
  const budget = inferBudgetTerms(query)
  const price = normalizeNumber(artwork.price, null)
  let computedKeywordScore = 0
  let tagScore = 0
  let categoryScore = 0
  let priceScore = 0

  terms.forEach((term) => {
    if (documentTokens.includes(term)) {
      computedKeywordScore += 3
      return
    }

    if (documentTokens.some((token) => token.includes(term) || term.includes(token))) {
      computedKeywordScore += 1.2
    }
  })

  moods.forEach((mood) => {
    const normalizedMood = normalizeText(mood)
    const moodKeywords = MOOD_KEYWORDS[normalizedMood] || []
    const hasMoodMatch =
      signals.tags.some((tag) => moodKeywords.includes(tag)) ||
      moodKeywords.some((keyword) => documentTokens.includes(keyword))

    if (hasMoodMatch) {
      tagScore += 2.5
    }
  })

  const normalizedQuery = normalizeText(query)
  if (
    signals.category &&
    (documentTokens.includes(signals.category) ||
      normalizedQuery.includes(signals.category) ||
      terms.includes(signals.category))
  ) {
    categoryScore += 0
  }

  if (budget.wantsGift && Number.isFinite(price)) {
    priceScore += price <= 5000 ? 1.5 : 0.5
  }

  if (budget.wantsAffordable && Number.isFinite(price)) {
    priceScore += price <= 4000 ? 2 : 0
  }

  if (Number.isFinite(budget.targetPrice) && Number.isFinite(price) && budget.targetPrice > 0) {
    const proximity = 1 - Math.min(1, Math.abs(price - budget.targetPrice) / budget.targetPrice)
    priceScore += proximity * 2
  }

  if (artwork.is_featured === true) {
    computedKeywordScore += 0.25
  }

  return {
    score,
    matchedTerms,
    components: {
      embedding_score: 0,
      keyword_score: Number(computedKeywordScore.toFixed(3)),
      tag_score: Number(tagScore.toFixed(3)),
      category_score: Number(categoryScore.toFixed(3)),
      price_score: Number(priceScore.toFixed(3)),
    },
    weights: {
      embedding_weight: 0,
      keyword_weight: 1,
      tag_weight: 1,
      category_weight: 1,
      price_weight: 1,
    },
    terms,
  }
}

export function explainSmartSearchMatch(artwork = {}, query = '', moods = [], matchedTerms = []) {
  const parts = []
  const tags = normalizeTags(artwork.tags)
  const category = normalizeText(artwork.category)

  if (matchedTerms.length > 0) {
    parts.push(`matches ${matchedTerms.slice(0, 3).join(', ')}`)
  }

  if (moods.length > 0) {
    parts.push(`fits the ${moods.slice(0, 2).join(' and ')} mood`)
  }

  if (tags.length > 0) {
    parts.push(`shares tags like ${tags.slice(0, 2).join(', ')}`)
  } else if (category) {
    parts.push(`belongs to ${category}`)
  }

  if (Number.isFinite(Number(artwork.price))) {
    parts.push(`sits around Rs. ${Number(artwork.price).toLocaleString()}`)
  }

  return parts.length > 0
    ? `Shown because it ${parts.slice(0, 3).join(', ')}.`
    : 'Shown because it is the closest local match for this search.'
}

export function smartKeywordSearch(artworks = [], query = '', moods = [], limit = 12) {
  const hasSearchIntent = normalizeText(query) || moods.length > 0

  if (!hasSearchIntent) {
    return artworks.slice(0, limit).map((artwork) => ({
      artwork,
      score: 0,
      explanation: 'Shown from the current browsing order.',
      source: 'default',
    }))
  }

  return artworks
    .map((artwork) => {
      const result = scoreArtworkForSearch(artwork, query, moods)
      return {
        artwork,
        score: result.score,
        explanation: explainSmartSearchMatch(artwork, query, moods, result.matchedTerms),
        source: 'keyword',
      }
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || Number(left.artwork.id) - Number(right.artwork.id))
    .slice(0, Math.max(1, Number(limit) || 12))
}

export function suggestArtworkTags(artwork = {}) {
  const documentText = normalizeText(
    [artwork.title, artwork.description, artwork.medium, artwork.category].filter(Boolean).join(' '),
  )
  const tagRules = [
    { tag: 'minimal', keywords: ['minimal', 'simple', 'clean', 'modern', 'neutral'] },
    { tag: 'bold', keywords: ['bold', 'strong', 'dramatic', 'vibrant', 'statement'] },
    { tag: 'spiritual', keywords: ['spiritual', 'divine', 'sacred', 'god', 'meditative'] },
    { tag: 'calm', keywords: ['calm', 'peaceful', 'soft', 'quiet', 'serene'] },
    { tag: 'gift', keywords: ['gift', 'mom', 'mother', 'friend', 'personal', 'memory'] },
    { tag: 'anime', keywords: ['anime', 'manga', 'character', 'figure'] },
    { tag: 'portrait', keywords: ['portrait', 'face', 'person', 'couple'] },
    { tag: 'abstract', keywords: ['abstract', 'texture', 'form', 'expression'] },
    { tag: 'nature', keywords: ['nature', 'flower', 'botanical', 'leaf', 'sky'] },
    { tag: 'canvas', keywords: ['canvas', 'acrylic', 'painting'] },
    { tag: 'sketch', keywords: ['sketch', 'graphite', 'pencil', 'charcoal', 'study'] },
  ]
  const categoryTag = normalizeText(artwork.category)
  const suggested = tagRules
    .filter((rule) => rule.keywords.some((keyword) => documentText.includes(keyword)))
    .map((rule) => rule.tag)

  if (categoryTag) {
    suggested.push(categoryTag)
  }

  return normalizeTags(suggested).slice(0, 10)
}
