import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://careers.amperecomputing.com/'
export const SEARCH_URL = 'https://careers.amperecomputing.com/search/jobs'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '').replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const parseLocation = (value) => {
  const location = normalizeWhitespace(value)
  const parts = location?.split(',').map(normalizeWhitespace).filter(Boolean) || []
  return {
    location,
    city: parts[0] || null,
    country: parts.at(-1) || null,
  }
}

const extractLabeledText = (html, className) => stripTags(
  html.match(new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, 'i'))?.[1],
)

export const extractSearchResults = (html) => {
  const results = []
  const cards = String(html ?? '').match(/<(?:div|li)[^>]+class=["'][^"']*(?:job-card|job-listing|job-search-result)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|li)>/gi) || []

  for (const card of cards) {
    const match = card.match(/href=["'](\/jobs\/(\d+)-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
    if (!match) continue

    const [, pathName, jobId, rawTitle] = match
    const location = extractLabeledText(card, 'job-location')
    if (!location || !/\bIndia\s*$/i.test(location)) continue

    results.push({
      title: stripTags(rawTitle),
      category: extractLabeledText(card, 'job-category'),
      location,
      jobId,
      sourceUrl: new URL(pathName, SEARCH_URL).toString(),
    })
  }

  return results
}

const extractJsonLd = (html) => {
  const raw = String(html ?? '').match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.find((entry) => entry?.['@type'] === 'JobPosting') : parsed
  } catch {
    return null
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('full')) return 'Full-time'
  if (normalized.includes('part')) return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return normalizeWhitespace(value)
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createAmpereComputingScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const searchHtml = await fetchText(SEARCH_URL)
    const listings = extractSearchResults(searchHtml)
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJsonLd(detailHtml) || {}
      const parsedLocation = parseLocation(
        detail.jobLocation?.address
          ? [
              detail.jobLocation.address.addressLocality,
              detail.jobLocation.address.addressRegion,
              detail.jobLocation.address.addressCountry,
            ].filter(Boolean).join(', ')
          : listing.location,
      )

      jobs.push({
        title: normalizeWhitespace(detail.title) || listing.title,
        company: 'Ampere Computing',
        location: parsedLocation.location,
        city: parsedLocation.city,
        country: parsedLocation.country,
        link: listing.sourceUrl,
        applyUrl: listing.sourceUrl,
        sourceUrl: listing.sourceUrl,
        source: 'amperecomputing',
        jobId: listing.jobId,
        requisitionId: listing.jobId,
        department: listing.category,
        employmentType: normalizeEmploymentType(detail.employmentType),
        experienceRequired: null,
        postingDate: normalizeWhitespace(detail.datePosted),
        closingDate: normalizeWhitespace(detail.validThrough),
        jobDescription: stripTags(detail.description),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        remoteStatus: 'On-site',
        scrapedAt: new Date().toISOString(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createAmpereComputingScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'amperecomputing')
  }
}
