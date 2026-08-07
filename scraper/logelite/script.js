import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'logelite'
export const COMPANY = 'Logelite'
export const HOMEPAGE_URL = 'https://logelite.com/'
export const CAREERS_URL = 'https://logelite.com/career/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Logelite',
  adapter: 'script',
  modulePath: '../logelite/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-page-job-cards',
  extractionStrategy: 'verified-first-party-careers-page+same-page-role-cards+first-party-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'logelite.com',
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary:
    'Verified on Monday, August 3, 2026 that https://logelite.com/career/ is still the live first-party Logelite careers page and that it publicly exposes role cards such as Human Resource Executive, Business Development Manager, and SEO Executive with Lucknow location text plus first-party role pages, Download Details PDFs, and Apply Now links.',
  dryRunFile: 'logelite/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#039;|&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const parseLocation = (value) => {
  const city = normalizeWhitespace(value) || null
  if (!city) {
    return {
      city: null,
      location: null,
    }
  }

  return {
    city,
    location: /india/i.test(city) ? city : `${city}, India`,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title[^>]*>\s*Join Our Dynamic Digital Marketing &(?:amp;|#038;)? Web Development Team\s*<\/title>/i.test(page)
    && text.includes('Open Job Positions')
    && text.includes('Your Career Starts Here')
    && text.includes('Human Resource Executive')
    && text.includes('Apply Now')
}

export const extractJobCards = (html = '') => pageToBlocks(html)
  .map((block) => {
    const title = normalizeWhitespace(block.match(/<h3 class="card-title">([\s\S]*?)<\/h3>/i)?.[1])
    const detailPageHref = block.match(/<h3 class="card-title">[\s\S]*?<a[^>]+href=["']([^"']+)["']/i)?.[1]
    const openings = normalizeWhitespace(block.match(/<span class="card-status">([\s\S]*?)<\/span>/i)?.[1])
    const metaLines = [...block.matchAll(/<p class="card-meta-item">([\s\S]*?)<\/p>/gi)]
      .map((item) => normalizeWhitespace(item[1]))
      .filter(Boolean)
    const description = normalizeWhitespace(block.match(/<p class="card-disc">([\s\S]*?)<\/p>/i)?.[1])
    const links = [...block.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .map((item) => ({
        href: new URL(item[1], CAREERS_URL).toString(),
        label: normalizeWhitespace(item[2]),
      }))

    const { city, location } = parseLocation(metaLines[0])
    const sourceUrl = detailPageHref
      ? new URL(detailPageHref, CAREERS_URL).toString()
      : CAREERS_URL
    const applyUrl = links.find((item) => item.label === 'Apply Now')?.href ?? null

    if (!title || !location || !applyUrl) return null

    return {
      title,
      city,
      location,
      openings: normalizeWhitespace(openings?.replace(/^Total Openings\s*/i, '')),
      compensation: metaLines[1] || null,
      description: description || null,
      sourceUrl,
      applyUrl,
    }
  })
  .filter(Boolean)

const pageToBlocks = (html = '') => String(html ?? '').split(/<div class="career-page-card">/i).slice(1)

export const createLogeliteScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Logelite verified first-party careers page changed materially')
    }

    const jobs = extractJobCards(careersHtml)
    if (!jobs.length) {
      throw new Error('Logelite verified first-party careers page no longer exposes public role cards')
    }

    return jobs.map((job) => ({
      title: job.title,
      company: COMPANY,
      location: job.location,
      city: job.city,
      country: 'India',
      openings: job.openings,
      compensation: job.compensation,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      jobDescription: job.description,
      link: job.applyUrl,
      source: SOURCE,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createLogeliteScraper().run(options)
