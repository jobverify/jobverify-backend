export const IQVIA_ORIGIN = 'https://jobs.iqvia.com'
export const CAREERS_URL = `${IQVIA_ORIGIN}/en`
export const JOBS_PATH = '/en/jobs'
export const JOBS_URL = `${IQVIA_ORIGIN}${JOBS_PATH}`
export const INDIA_LOCATION_SIGNALS = [
  'india',
  'bengaluru',
  'gurugram',
  'hyderabad',
  'kochi',
  'kolkata',
  'mumbai',
  'pune',
]

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? ''))

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const toIqviaUrl = (value) => {
  if (!value) return null
  try {
    const url = new URL(decodeHtmlEntities(value), IQVIA_ORIGIN)
    return url.origin === IQVIA_ORIGIN ? url.toString() : null
  } catch {
    return null
  }
}

const extractCity = (location) => normalizeWhitespace(location)?.split(',')[0] || null

const extractJobId = (value) => extractFirst(
  /\/en\/jobs\/([^/?#]+)(?:[/?#]|$)/i,
  value,
  (match) => match[1],
)

const extractDefinitionFields = (html) => {
  const fields = new Map()
  for (const match of String(html ?? '').matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)) {
    const label = stripTags(match[1])?.toLowerCase()
    const value = stripTags(match[2])
    if (label && value) fields.set(label, value)
  }
  return fields
}

const extractRequiredSkills = (html) => [...String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractDescription = (html) => {
  const sectionHtml = extractFirst(
    /<section\b[^>]*class=["'][^"']*job-description[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
    html,
  )
  if (!sectionHtml) return null

  return stripTags(
    extractFirst(/<p[^>]*>([\s\S]*?)<\/p>/i, sectionHtml)
    || sectionHtml,
  )
}

export const buildListingUrl = (page = 1) => {
  const url = new URL(JOBS_URL)
  if (Number.isInteger(page) && page > 1) {
    url.searchParams.set('page', String(page))
  }
  return url.toString()
}

export const isIndiaLocation = (location) => {
  const normalized = String(location ?? '').toLowerCase()
  return INDIA_LOCATION_SIGNALS.some((signal) => normalized.includes(signal))
}

export const extractResultCount = (html) => {
  const countText = stripTags(
    extractFirst(/<[^>]*class=["'][^"']*results-count[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i, html)
    || '',
  )
  const count = /\bof\s+(\d+)\s+jobs\b/i.exec(countText || '')
  return count ? Number.parseInt(count[1], 10) : null
}

export const extractSearchResults = (html) => [...String(html ?? '').matchAll(
  /<article\b[^>]*class=["'][^"']*job-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi,
)]
  .map((match) => {
    const card = match[1]
    const sourceUrl = toIqviaUrl(
      extractFirst(/<a\b[^>]*class=["'][^"']*job-title[^"']*["'][^>]*href=["']([^"']+)["']/i, card),
    )
    const title = stripTags(
      extractFirst(/<a\b[^>]*class=["'][^"']*job-title[^"']*["'][^>]*>([\s\S]*?)<\/a>/i, card),
    )
    const location = stripTags(
      extractFirst(/<p\b[^>]*class=["'][^"']*job-location[^"']*["'][^>]*>([\s\S]*?)<\/p>/i, card),
    )
    const workplaceType = stripTags(
      extractFirst(/<p\b[^>]*class=["'][^"']*job-workplace[^"']*["'][^>]*>([\s\S]*?)<\/p>/i, card),
    )
    const jobId = extractJobId(sourceUrl)

    if (!title || !location || !sourceUrl || !jobId || !isIndiaLocation(location)) return null

    return {
      title,
      location,
      city: extractCity(location),
      country: 'India',
      workplaceType,
      jobId,
      requisitionId: jobId,
      sourceUrl,
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html, listing = {}) => {
  const fields = extractDefinitionFields(html)
  const location = fields.get('location') || listing.location || null
  const jobId = fields.get('job id') || listing.jobId || extractJobId(listing.sourceUrl)

  return {
    title: stripTags(extractFirst(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)) || listing.title || null,
    location,
    city: extractCity(location) || listing.city || null,
    country: isIndiaLocation(location) ? 'India' : listing.country || null,
    workplaceType: fields.get('workplace') || listing.workplaceType || null,
    jobId,
    requisitionId: jobId || listing.requisitionId || null,
    sourceUrl: listing.sourceUrl || null,
    applyUrl: toIqviaUrl(
      extractFirst(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i, html),
    ),
    postingDate: fields.get('date posted') || null,
    jobDescription: extractDescription(html),
    requiredSkills: extractRequiredSkills(
      extractFirst(
        /<section\b[^>]*class=["'][^"']*job-description[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
        html,
      ),
    ),
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Jobverify IQVIA scraper)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

const toNormalizedJob = (detail) => ({
  title: detail.title,
  company: 'IQVIA',
  department: null,
  location: detail.location,
  city: detail.city,
  country: detail.country,
  workplaceType: detail.workplaceType,
  jobId: detail.jobId,
  requisitionId: detail.requisitionId,
  sourceUrl: detail.sourceUrl,
  applyUrl: detail.applyUrl,
  employmentType: null,
  experienceRequired: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: detail.requiredSkills,
  postingDate: detail.postingDate,
  closingDate: null,
  jobDescription: detail.jobDescription,
  source: 'iqvia',
  link: detail.applyUrl || detail.sourceUrl,
  scrapedAt: new Date().toISOString(),
})

export const createIqviaScraper = ({ fetchText = defaultFetchText } = {}) => ({
  async run({ maxPages = 1, fetchText: getHtml = fetchText } = {}) {
    const jobs = []
    const seenJobIds = new Set()
    const totalPages = Math.max(1, Number.isInteger(maxPages) ? maxPages : 1)

    for (let page = 1; page <= totalPages; page += 1) {
      const listings = extractSearchResults(await getHtml(buildListingUrl(page)))
      if (listings.length === 0) break

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detail = extractJobDetail(await getHtml(listing.sourceUrl), listing)
        if (!detail.sourceUrl || !isIndiaLocation(detail.location)) continue

        jobs.push(toNormalizedJob(detail))
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createIqviaScraper().run(options)
