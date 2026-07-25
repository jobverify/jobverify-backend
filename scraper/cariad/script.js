import https from 'node:https'

export const BASE_URL = 'https://jobs.volkswagen-group.com'
export const SEARCH_PATH = '/cariad/search/?createNewAlert=false&q=&locationsearch=&optionsFacetsDD_country=&optionsFacetsDD_department=&optionsFacetsDD_shifttype=&locale=en_US'
export const CAREER_PAGE_URL = new URL('/cariad/', BASE_URL).toString()

const INDIA_LOCATION_PATTERN = /\b(india|bengaluru|bangalore|pune|hyderabad|chennai|mumbai|gurugram|gurgaon|noida|delhi|navi mumbai)\b/i

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&hellip;/gi, '...')

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  try {
    return new URL(decodeHtmlEntities(value), BASE_URL).toString()
  } catch {
    return null
  }
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const defaultFetchText = (url) =>
  new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        },
      },
      (response) => {
        const chunks = []

        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')

          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode} for ${url}`))
            return
          }

          resolve(body)
        })
      },
    )

    request.on('error', reject)
  })

export const buildSearchUrl = () => new URL(SEARCH_PATH, BASE_URL).toString()

export const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

const isIndiaLocation = (location) => INDIA_LOCATION_PATTERN.test(String(location || ''))

const extractJobIdFromUrl = (value) =>
  extractFirst(/\/(\d+)\/?(?:[#?].*)?$/i, value, (match) => match[1])

export const extractSearchResults = (html) => {
  const rows = [...String(html).matchAll(/<tr class="data-row">([\s\S]*?)<\/tr>/gi)]

  return rows
    .map((rowMatch) => {
      const rowHtml = rowMatch[1]
      const title = normalizeWhitespace(
        extractFirst(/<a[^>]*class="jobTitle-link"[^>]*>([\s\S]*?)<\/a>/i, rowHtml),
      )
      const relativeLink = normalizeWhitespace(
        extractFirst(/<a(?=[^>]*class="jobTitle-link")(?=[^>]*href="([^"]+)")[^>]*>/i, rowHtml),
      )
      const department = normalizeWhitespace(
        extractFirst(/<span class="jobDepartment">\s*([\s\S]*?)\s*<\/span>/i, rowHtml),
      )
      const location = normalizeWhitespace(
        extractFirst(/<span class="jobLocation">\s*([\s\S]*?)\s*<\/span>/i, rowHtml),
      )
      const postingDate = normalizeWhitespace(
        extractFirst(/<span class="jobDate">\s*([\s\S]*?)\s*<\/span>/i, rowHtml),
      )
      const sourceUrl = toAbsoluteUrl(relativeLink)
      const jobId = extractJobIdFromUrl(sourceUrl)

      if (!title || !location || !sourceUrl || !jobId || !isIndiaLocation(location)) return null

      return {
        title,
        department,
        location,
        city: extractCity(location),
        jobId,
        requisitionId: jobId,
        sourceUrl,
        postingDate,
      }
    })
    .filter(Boolean)
}

export const extractJobDetail = (html, listing = {}) => {
  const title = normalizeWhitespace(
    extractFirst(/itemprop="title"[^>]*>([\s\S]*?)<\/span>/i, html),
  ) || listing.title || null
  const location = normalizeWhitespace(
    extractFirst(/itemprop="streetAddress" content="([^"]+)"/i, html),
  ) || listing.location || null
  const postingDate = normalizeWhitespace(
    extractFirst(/itemprop="datePosted" content="([^"]+)"/i, html),
  ) || listing.postingDate || null
  const descriptionHtml = extractFirst(
    /<span class="jobdescription">([\s\S]*?)<\/span>\s*<\/span>/i,
    html,
  )
  const requiredSkills = [...String(descriptionHtml ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
  const applyPath = normalizeWhitespace(
    extractFirst(/class="btn btn-primary btn-large btn-lg apply dialogApplyBtn "\s+href="([^"]+)"/i, html),
  )

  return {
    title,
    location,
    city: listing.city || extractCity(location),
    jobId: listing.jobId || extractJobIdFromUrl(listing.sourceUrl),
    requisitionId: listing.requisitionId || listing.jobId || extractJobIdFromUrl(listing.sourceUrl),
    employmentType: null,
    experienceRequired: null,
    jobDescription: stripTags(descriptionHtml),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills,
    postingDate,
    closingDate: null,
    applyUrl: toAbsoluteUrl(applyPath),
    sourceUrl: listing.sourceUrl || null,
  }
}

export const createCariadScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const jobs = []
    const listingHtml = await fetchText(buildSearchUrl())
    const listings = extractSearchResults(listingHtml)

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        jobId: detail.jobId || listing.jobId,
        requisitionId: detail.requisitionId || listing.requisitionId,
        title: detail.title || listing.title,
        company: 'CARIAD',
        department: listing.department || null,
        location: detail.location || listing.location,
        city: detail.city || listing.city,
        country: 'India',
        link: detail.applyUrl || detail.sourceUrl || listing.sourceUrl,
        applyUrl: detail.applyUrl || listing.sourceUrl,
        sourceUrl: detail.sourceUrl || listing.sourceUrl,
        source: 'cariad',
        employmentType: detail.employmentType,
        experienceRequired: detail.experienceRequired,
        jobDescription: detail.jobDescription,
        minimumQualification: detail.minimumQualification,
        preferredQualification: detail.preferredQualification,
        requiredSkills: detail.requiredSkills,
        postingDate: detail.postingDate || listing.postingDate,
        closingDate: detail.closingDate,
        scrapedAt: new Date().toISOString(),
      })
    }

    return jobs
  },
})

export const run = async () => createCariadScraper().run()
