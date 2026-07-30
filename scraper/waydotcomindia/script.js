import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'waydotcomindia'
export const COMPANY = 'Way Dot Com India Private Limited'
export const COMPANY_DOMAIN = 'way.com'
export const CAREERS_URL = 'https://www.way.com/careers'
export const JOBS_JSON_URL = 'https://www.way.com/assets/jobs.json'
export const APPLICATION_EMAIL = 'careers@way.com'
export const DETAIL_URL_PATTERN = /^https:\/\/www\.way\.com\/careers\/(\d+)\/[^?#]+(?:\?[^#]+)?$/i
export const VERIFIED_CAREERS_SIGNALS = [
  'Join our Team of Innovators and Creators',
  'Filter by department',
  'Filter by location',
  'View Jobs',
]

const NAVIGATION_TIMEOUT_MS = 45000
const PAGE_SETTLE_MS = 1200

const INDIAN_STATE_PATTERN = new RegExp([
  'andhra pradesh',
  'arunachal pradesh',
  'assam',
  'bihar',
  'chhattisgarh',
  'goa',
  'gujarat',
  'haryana',
  'himachal pradesh',
  'jharkhand',
  'karnataka',
  'kerala',
  'madhya pradesh',
  'maharashtra',
  'manipur',
  'meghalaya',
  'mizoram',
  'nagaland',
  'odisha',
  'punjab',
  'rajasthan',
  'sikkim',
  'tamil nadu',
  'telangana',
  'tripura',
  'uttar pradesh',
  'uttarakhand',
  'west bengal',
  'andaman and nicobar islands',
  'chandigarh',
  'dadra and nagar haveli and daman and diu',
  'delhi',
  'jammu and kashmir',
  'ladakh',
  'lakshadweep',
  'puducherry',
  'india',
].join('|'), 'i')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[â€“â€”]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/main)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'job'

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const uniqueBy = (items, getKey) => {
  const seen = new Set()
  const results = []

  for (const item of items) {
    const key = getKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    results.push(item)
  }

  return results
}

const extractCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0])

export const buildJobDetailUrl = (job = {}) =>
  `${CAREERS_URL}/${encodeURIComponent(String(job.id))}/${slugify(job.title)}?from=profile`

const hasIndiaCountryMarker = (job = {}) =>
  String(job.countryCode ?? '').toLowerCase() === 'in' || isIndiaLocation(job.location)

export const extractJobsFromJson = (payload = [], { scrapedAt = new Date().toISOString() } = {}) => (
  (Array.isArray(payload) ? payload : [])
    .filter((job) => job?.id != null && job?.title && hasIndiaCountryMarker(job))
    .map((job) => {
      const sourceUrl = buildJobDetailUrl(job)
      const location = normalizeWhitespace(job.location)
      const normalizedLocation = /india/i.test(location || '')
        ? location
        : `${location}, India`

      return {
        title: normalizeWhitespace(job.title),
        company: COMPANY,
        department: normalizeWhitespace(job.department),
        location: normalizedLocation,
        city: extractCity(location),
        country: 'India',
        jobId: String(job.id),
        requisitionId: String(job.id),
        sourceUrl,
        applyUrl: `mailto:${APPLICATION_EMAIL}`,
        employmentType: normalizeWhitespace(job.jobType),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: Array.isArray(job.skills) ? job.skills.map(normalizeWhitespace).filter(Boolean) : [],
        postingDate: normalizeWhitespace(job.date),
        closingDate: null,
        jobDescription: stripTags(job.description),
        source: SOURCE,
        companyDomain: COMPANY_DOMAIN,
        companyCareerPage: CAREERS_URL,
        link: sourceUrl,
        scrapedAt,
      }
    })
)

let browserUtilsPromise

const loadBrowserUtils = async () => {
  browserUtilsPromise ||= import('../utils/browser.js')
  return browserUtilsPromise
}

export const waitForPageSettle = async (page, timeoutMs = PAGE_SETTLE_MS) => {
  if (typeof page?.waitForTimeout === 'function') {
    await page.waitForTimeout(timeoutMs)
    return
  }

  await new Promise((resolve) => {
    setTimeout(resolve, timeoutMs)
  })
}

export const isIndiaLocation = (location) => INDIAN_STATE_PATTERN.test(String(location ?? ''))

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = stripTags(page) || ''

  return /<title>\s*Way\s*\|\s*Find\s*&amp;\s*Reserve Parking, Car Wash, Roadside Assistance\s*&amp;\s*More\s*<\/title>/i.test(page)
    && VERIFIED_CAREERS_SIGNALS.every((signal) => normalized.includes(signal))
}

export const extractJobCards = (html) => {
  const cards = []

  for (const match of String(html ?? '').matchAll(
    /<div[^>]+class="[^"]*\bjob-card\b[^"]*"[^>]*>[\s\S]*?<button[^>]+class="[^"]*\boutline-btn-grn\b[^"]*"[^>]*>[\s\S]*?<\/button>\s*<\/div>/gi,
  )) {
    const cardHtml = match[0]
    const title = normalizeWhitespace(
      cardHtml.match(/<div[^>]+class="[^"]*\bfcard-title\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1],
    )
    const metadata = Array.from(
      cardHtml.matchAll(/<div[^>]+class="[^"]*\bmt-8\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi),
      (entry) => normalizeWhitespace(entry[1]),
    ).filter(Boolean)

    if (!title || metadata.length < 2) continue

    cards.push({
      title,
      department: null,
      employmentType: metadata[0],
      location: metadata[1],
    })
  }

  return cards
}

const extractEmailApplyUrl = (html) => {
  const match = String(html ?? '').match(/Send your CV\/Resume to\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\s+to apply/i)
  return match ? `mailto:${match[1].toLowerCase()}` : null
}

export const extractJobDetail = (html, listing) => {
  const sourceUrl = normalizeWhitespace(listing?.sourceUrl)
  if (!DETAIL_URL_PATTERN.test(sourceUrl || '')) {
    throw new Error('Way.com job detail URL no longer matches the verified first-party route pattern')
  }

  const title = normalizeWhitespace(
    String(html ?? '').match(/<title>\s*([^<]+?)\s*-\s*Way\.com\s*<\/title>/i)?.[1],
  ) || normalizeWhitespace(listing?.title)
  const text = stripTags(html) || ''

  if (
    !title
    || !text.includes('Job Summary')
    || !text.includes('Apply Now')
    || !/Send your CV\/Resume to\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\s+to apply/i.test(text)
  ) {
    throw new Error('Way.com job detail page no longer matches the verified public job detail surface')
  }

  const metaPattern = new RegExp(
    `${escapeRegex(title)}\\s+${escapeRegex(normalizeWhitespace(listing?.employmentType) || '')}\\s+(.+?)\\s+Posted on\\s+([0-9]{1,2}-[A-Za-z]+-[0-9]{4})\\s+Job Summary`,
    'i',
  )
  const metaMatch = text.match(metaPattern)
  const location = normalizeWhitespace(metaMatch?.[1] || listing?.location)
  const postingDate = normalizeWhitespace(metaMatch?.[2])

  if (!location) {
    throw new Error('Way.com job detail page is missing the verified location metadata')
  }

  if (!isIndiaLocation(location)) {
    return null
  }

  const descriptionMatch = text.match(/Job Summary\s+([\s\S]*?)\s+Send your CV\/Resume to\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\s+to apply/i)
  const jobDescription = normalizeWhitespace(descriptionMatch?.[1])
  const jobId = normalizeWhitespace(sourceUrl.match(DETAIL_URL_PATTERN)?.[1])
  const applyUrl = extractEmailApplyUrl(html)

  if (!jobId || !jobDescription || !applyUrl) {
    throw new Error('Way.com job detail page is missing required public job fields')
  }

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(listing?.department),
    location: `${location}, India`,
    city: extractCity(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl,
    employmentType: normalizeWhitespace(listing?.employmentType),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate,
    closingDate: null,
    jobDescription,
  }
}

const ensureListingsExpanded = async (page) => {
  await page.waitForSelector('button.view-jobs-btn', { timeout: NAVIGATION_TIMEOUT_MS })

  const cardCount = await page.$$eval('.job-card', (cards) => cards.length).catch(() => 0)
  if (cardCount > 0) return

  await page.click('button.view-jobs-btn')
  await page.waitForSelector('.job-card .outline-btn-grn', { timeout: NAVIGATION_TIMEOUT_MS })
  await waitForPageSettle(page)
}

const browseCareersSurface = async ({
  launchBrowserImpl,
  createOptimizedPageImpl,
} = {}) => {
  if (!launchBrowserImpl || !createOptimizedPageImpl) {
    const browserUtils = await loadBrowserUtils()
    launchBrowserImpl ||= browserUtils.launchBrowser
    createOptimizedPageImpl ||= browserUtils.createOptimizedPage
  }

  const browser = await launchBrowserImpl()

  try {
    const page = await createOptimizedPageImpl(browser)
    await page.goto(CAREERS_URL, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
    await page.waitForSelector('body', { timeout: NAVIGATION_TIMEOUT_MS })
    await waitForPageSettle(page)

    const careersHtml = await page.content()
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Way.com official careers surface no longer matches the verified first-party shell')
    }

    const jobsJson = await page.evaluate(async (jobsJsonUrl) => {
      const response = await fetch(jobsJsonUrl, {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${jobsJsonUrl}`)
      }

      return response.json()
    }, JOBS_JSON_URL)

    return {
      careersHtml,
      jobsJson,
    }
  } finally {
    await browser.close()
  }
}

export const createWayDotComIndiaScraper = ({
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    browseCareersSurfaceImpl = browseCareersSurface,
  } = {}) {
    const careersSurface = await browseCareersSurfaceImpl({ maxJobs })

    if (!hasOfficialCareersSignal(careersSurface?.careersHtml)) {
      throw new Error('Way.com official careers surface no longer matches the verified first-party shell')
    }

    const jobs = uniqueBy(
      extractJobsFromJson(careersSurface?.jobsJson, { scrapedAt: now() }),
      (job) => `${normalizeWhitespace(job?.title)}::${normalizeWhitespace(job?.location)}::${normalizeWhitespace(job?.sourceUrl)}`,
    )

    if (jobs.length === 0) {
      throw new Error('Way.com careers page no longer exposes trusted India jobs in the public jobs JSON')
    }

    return Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createWayDotComIndiaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
