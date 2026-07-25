import { fetchTextWithRetry } from '../utils/fetch.js'

export const SOURCE = 'godrejenterprisesgroup'
export const COMPANY = 'Godrej Enterprises Group'
export const CAREERS_URL = 'https://www.godrejenterprises.com/about-us/careers/openings/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const OFFICIAL_TITLE_PATTERN = /<title>\s*Careers\s*-\s*Build\s+your\s+Career\s+at\s+Godrej\s+Enterprises\s+Group\s*<\/title>/i
const OFFICIAL_BRAND_PATTERN = /Godrej\s+Enterprises\s+Group/i
const OFFICIAL_CANONICAL_PATTERN = /<link\s+rel="canonical"\s+href="https:\/\/www\.godrejenterprises\.com\/about-us\/careers\/openings\/?"/i
const FUNCTION_FILTER_PATTERN = />\s*Function\s*</i
const BUSINESS_UNIT_FILTER_PATTERN = />\s*Business\s+Unit\s*</i
const LOCATION_FILTER_PATTERN = />\s*Location\s*</i
const VACANCY_LINK_PATTERN = /vacancy-details\?SRNO=\d+/i
const ROW_PATTERN = /<tr[^>]*class="ui-job-listing__opening[^"]*"[^>]*data-location="([^"]*)"[^>]*data-business-unit="([^"]*)"[^>]*data-function="([^"]*)"[^>]*>[\s\S]*?<a[^>]*class="ui-job-listing__content-title"[^>]*href="([^"]*vacancy-details\?SRNO=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span class="ui-job-listing__content-description">([\s\S]*?)<\/span>[\s\S]*?<td>\s*<span class="ui-job-listing__content-title">([\s\S]*?)<\/span>\s*<\/td>[\s\S]*?<td>\s*<span class="ui-job-listing__content-title">([\s\S]*?)<\/span>\s*<\/td>/gi

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtml(value)
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const buildAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const isVerifiedVacancyUrl = (value) => {
  try {
    const url = new URL(value)
    return url.hostname === 'careeropportunities.godrejenterprises.com'
      && url.pathname === '/CareerWEB/vacancy-details'
      && /^\d+$/.test(url.searchParams.get('SRNO') || '')
  } catch {
    return false
  }
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return OFFICIAL_TITLE_PATTERN.test(page)
    && OFFICIAL_BRAND_PATTERN.test(page)
    && OFFICIAL_CANONICAL_PATTERN.test(page)
    && FUNCTION_FILTER_PATTERN.test(page)
    && BUSINESS_UNIT_FILTER_PATTERN.test(page)
    && LOCATION_FILTER_PATTERN.test(page)
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Godrej Enterprises Group official careers surface no longer matches the verified public page')
  }

  const page = String(html ?? '')
  const jobs = [...page.matchAll(ROW_PATTERN)].map((match) => {
    const sourceUrl = buildAbsoluteUrl(match[4], CAREERS_URL)
    if (!sourceUrl || !isVerifiedVacancyUrl(sourceUrl)) {
      throw new Error('Godrej Enterprises Group verified vacancy detail links changed or moved off the first-party host')
    }

    const title = normalizeWhitespace(match[6])
    const city = normalizeWhitespace(match[7]) || null
    const businessUnit = normalizeWhitespace(match[8])

    return {
      title,
      company: COMPANY,
      department: businessUnit && businessUnit !== '-' ? businessUnit : null,
      location: city ? `${city}, India` : 'India',
      city,
      country: 'India',
      jobId: match[5],
      requisitionId: match[5],
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    }
  })

  if (jobs.length === 0 && VACANCY_LINK_PATTERN.test(page)) {
    throw new Error('Godrej Enterprises Group verified job-row structure changed and needs scraper review')
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createGodrejEnterprisesGroupScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const html = await fetchText(CAREERS_URL)

    return extractPublicJobs(html).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createGodrejEnterprisesGroupScraper().run(options)
