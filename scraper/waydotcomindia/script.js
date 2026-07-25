import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'waydotcomindia'
export const COMPANY = 'Way Dot Com India Private Limited'
export const COMPANY_DOMAIN = 'way.com'
export const CAREERS_URL = 'https://www.way.com/careers'
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
  maxJobs = null,
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

    await ensureListingsExpanded(page)

    const expandedHtml = await page.content()
    const listingCards = extractJobCards(expandedHtml)
    if (listingCards.length === 0) {
      throw new Error('Way.com careers page no longer exposes the verified public job cards')
    }

    const selectedCards = Number.isInteger(maxJobs)
      ? listingCards.slice(0, maxJobs)
      : listingCards

    const listings = []

    for (let index = 0; index < selectedCards.length; index += 1) {
      await ensureListingsExpanded(page)

      await page.evaluate((buttonIndex) => {
        const buttons = Array.from(document.querySelectorAll('button.outline-btn-grn'))
        const target = buttons[buttonIndex]
        if (!target) {
          throw new Error(`Missing Way.com Apply Now button at index ${buttonIndex}`)
        }

        target.click()
      }, index)

      await page.waitForFunction(
        () => /^\/careers\/\d+\/[^/]+/i.test(window.location.pathname),
        { timeout: NAVIGATION_TIMEOUT_MS },
      )
      await waitForPageSettle(page)

      listings.push({
        ...selectedCards[index],
        sourceUrl: page.url(),
        detailHtml: await page.content(),
      })

      await page.goBack({ waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
      await page.waitForFunction(
        () => /\/careers\/?$/.test(window.location.pathname),
        { timeout: NAVIGATION_TIMEOUT_MS },
      )
      await waitForPageSettle(page)
    }

    return {
      careersHtml,
      listings,
    }
  } finally {
    await browser.close()
  }
}

export const createWayDotComIndiaScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    browseCareersSurfaceImpl = browseCareersSurface,
  } = {}) {
    const careersSurface = await browseCareersSurfaceImpl({ maxJobs })

    if (!hasOfficialCareersSignal(careersSurface?.careersHtml)) {
      throw new Error('Way.com official careers surface no longer matches the verified first-party shell')
    }

    const listings = uniqueBy(
      Array.isArray(careersSurface?.listings) ? careersSurface.listings : [],
      (listing) => `${normalizeWhitespace(listing?.title)}::${normalizeWhitespace(listing?.location)}::${normalizeWhitespace(listing?.sourceUrl)}`,
    )

    const jobs = []

    for (const listing of listings) {
      const job = extractJobDetail(listing.detailHtml, listing)
      if (!job) continue

      jobs.push({
        ...job,
        source: SOURCE,
        companyDomain: COMPANY_DOMAIN,
        companyCareerPage: CAREERS_URL,
        link: job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      })
    }

    return jobs
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
