import fs from 'node:fs/promises'
import path from 'node:path'

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeTag(value) {
  return normalizeText(value).toLowerCase()
}

function parseArtworks(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === 'object' && Array.isArray(payload.data)) {
    return payload.data
  }

  throw new Error('Expected a JSON array or an object with a "data" array.')
}

function percentage(part, total) {
  if (!total) {
    return '0.00'
  }

  return ((part / total) * 100).toFixed(2)
}

function collectPrimaryImage(artwork) {
  if (Array.isArray(artwork?.images)) {
    const firstImage = artwork.images.find((image) => typeof image === 'string' && image.trim())
    if (firstImage) {
      return firstImage.trim()
    }
  }

  if (typeof artwork?.image === 'string' && artwork.image.trim()) {
    return artwork.image.trim()
  }

  return ''
}

function analyzeArtworks(artworks) {
  const totalArtworks = artworks.length
  let emptyTagEntries = 0
  let artworksWithNoTags = 0
  let artworksWithTags = 0

  const normalizedTagCounts = new Map()
  const tagCaseVariants = new Map()
  const lowQualityTags = new Map()
  const normalizedTitleMap = new Map()
  const primaryImageMap = new Map()
  const duplicateFingerprints = new Map()

  for (const artwork of artworks) {
    const rawTags = Array.isArray(artwork?.tags) ? artwork.tags : []
    const validTags = []

    if (rawTags.length === 0) {
      artworksWithNoTags += 1
    }

    for (const rawTag of rawTags) {
      const trimmedTag = normalizeText(rawTag)
      if (!trimmedTag) {
        emptyTagEntries += 1
        continue
      }

      validTags.push(trimmedTag)
      const normalized = normalizeTag(trimmedTag)
      normalizedTagCounts.set(normalized, (normalizedTagCounts.get(normalized) || 0) + 1)

      if (!tagCaseVariants.has(normalized)) {
        tagCaseVariants.set(normalized, new Set())
      }
      tagCaseVariants.get(normalized).add(trimmedTag)

      if (trimmedTag.length <= 1 || /^\d+$/.test(trimmedTag) || normalized === 'tag') {
        if (!lowQualityTags.has(normalized)) {
          lowQualityTags.set(normalized, new Set())
        }
        lowQualityTags.get(normalized).add(trimmedTag)
      }
    }

    if (validTags.length > 0) {
      artworksWithTags += 1
    } else {
      artworksWithNoTags += rawTags.length > 0 ? 1 : 0
    }

    const normalizedTitle = normalizeTag(artwork?.title)
    if (normalizedTitle) {
      if (!normalizedTitleMap.has(normalizedTitle)) {
        normalizedTitleMap.set(normalizedTitle, [])
      }
      normalizedTitleMap.get(normalizedTitle).push({
        id: artwork?.id ?? null,
        title: artwork?.title || '',
      })
    }

    const primaryImage = collectPrimaryImage(artwork)
    if (primaryImage) {
      if (!primaryImageMap.has(primaryImage)) {
        primaryImageMap.set(primaryImage, [])
      }
      primaryImageMap.get(primaryImage).push({
        id: artwork?.id ?? null,
        title: artwork?.title || '',
      })
    }

    const fingerprint = [
      normalizedTitle,
      Number.isFinite(Number(artwork?.price)) ? Number(artwork.price) : '',
      primaryImage,
    ].join('::')

    if (fingerprint !== '::::') {
      if (!duplicateFingerprints.has(fingerprint)) {
        duplicateFingerprints.set(fingerprint, [])
      }
      duplicateFingerprints.get(fingerprint).push({
        id: artwork?.id ?? null,
        title: artwork?.title || '',
      })
    }
  }

  const casingInconsistencies = [...tagCaseVariants.entries()]
    .filter(([, variants]) => variants.size > 1)
    .map(([normalized, variants]) => ({
      normalized,
      variants: [...variants].sort(),
    }))
    .sort((left, right) => right.variants.length - left.variants.length || left.normalized.localeCompare(right.normalized))

  const topTags = [...normalizedTagCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 20)
    .map(([tag, count]) => ({
      tag,
      count,
      variants: tagCaseVariants.has(tag) ? [...tagCaseVariants.get(tag)].sort() : [],
    }))

  const duplicateTitles = [...normalizedTitleMap.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([normalized, rows]) => ({ normalized, rows }))

  const duplicatePrimaryImages = [...primaryImageMap.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([image, rows]) => ({ image, rows }))

  const duplicateRecords = [...duplicateFingerprints.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([fingerprint, rows]) => ({ fingerprint, rows }))

  return {
    totalArtworks,
    artworksWithTags,
    artworksWithNoTags,
    emptyTagEntries,
    topTags,
    casingInconsistencies,
    duplicateTitles,
    duplicatePrimaryImages,
    duplicateRecords,
    lowQualityTags: [...lowQualityTags.entries()].map(([normalized, variants]) => ({
      normalized,
      variants: [...variants].sort(),
      count: normalizedTagCounts.get(normalized) || 0,
    })),
  }
}

function printRows(label, rows, formatter) {
  console.log(`\n${label}`)
  if (!rows.length) {
    console.log('  none')
    return
  }

  rows.forEach((row, index) => {
    console.log(`  ${index + 1}. ${formatter(row)}`)
  })
}

async function main() {
  const inputPath = process.argv[2]

  if (!inputPath) {
    console.error('Usage: node scripts/audit-artwork-tags.mjs <path-to-artworks-json>')
    process.exit(1)
  }

  const resolvedPath = path.resolve(process.cwd(), inputPath)
  const raw = await fs.readFile(resolvedPath, 'utf8')
  const artworks = parseArtworks(JSON.parse(raw))
  const analysis = analyzeArtworks(artworks)

  console.log('ARTWORK TAG AUDIT SUMMARY')
  console.log(`Source: ${resolvedPath}`)
  console.log(`Total artworks: ${analysis.totalArtworks}`)
  console.log(
    `% with tags: ${percentage(analysis.artworksWithTags, analysis.totalArtworks)} (${analysis.artworksWithTags})`,
  )
  console.log(
    `% without tags: ${percentage(analysis.artworksWithNoTags, analysis.totalArtworks)} (${analysis.artworksWithNoTags})`,
  )
  console.log(`Empty tag entries: ${analysis.emptyTagEntries}`)
  console.log(`Duplicate titles: ${analysis.duplicateTitles.length}`)
  console.log(`Duplicate primary images: ${analysis.duplicatePrimaryImages.length}`)
  console.log(`Duplicate records: ${analysis.duplicateRecords.length}`)
  console.log(`Inconsistent casing groups: ${analysis.casingInconsistencies.length}`)

  printRows('TOP 20 TAGS', analysis.topTags, (row) => {
    const variants = row.variants.length > 1 ? ` | variants: ${row.variants.join(', ')}` : ''
    return `${row.tag} (${row.count})${variants}`
  })

  printRows('CASING INCONSISTENCIES', analysis.casingInconsistencies, (row) => {
    return `${row.normalized} -> ${row.variants.join(', ')}`
  })

  printRows('DUPLICATE TITLES', analysis.duplicateTitles, (row) => {
    return `${row.normalized} -> ${row.rows.map((item) => `#${item.id} ${item.title}`).join(' | ')}`
  })

  printRows('DUPLICATE PRIMARY IMAGES', analysis.duplicatePrimaryImages, (row) => {
    return `${row.image} -> ${row.rows.map((item) => `#${item.id} ${item.title}`).join(' | ')}`
  })

  printRows('DUPLICATE RECORDS', analysis.duplicateRecords, (row) => {
    return `${row.fingerprint} -> ${row.rows.map((item) => `#${item.id} ${item.title}`).join(' | ')}`
  })

  printRows('LOW-QUALITY TAGS', analysis.lowQualityTags, (row) => {
    return `${row.normalized} (${row.count}) -> ${row.variants.join(', ')}`
  })

  console.log('\nFLAGS')
  if (analysis.artworksWithNoTags > 0 || analysis.emptyTagEntries > 0) {
    console.log(
      `  missing tags: ${analysis.artworksWithNoTags} artworks without usable tags, ${analysis.emptyTagEntries} empty tag entries`,
    )
  } else {
    console.log('  missing tags: none')
  }

  if (analysis.lowQualityTags.length > 0) {
    console.log(
      `  low-quality tags: ${analysis.lowQualityTags.length} suspicious normalized tags detected`,
    )
  } else {
    console.log('  low-quality tags: none')
  }
}

main().catch((error) => {
  console.error('Artwork audit failed.')
  console.error(error?.stack || error?.message || String(error))
  process.exit(1)
})
