import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'unifiedinfotech'
export const COMPANY = 'Unified Infotech'
export const CAREERS_URL = 'https://www.unifiedinfotech.net/careers/'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Unified Infotech',
  adapter: 'script',
  modulePath: '../unifiedinfotech/script.js',
  homepageUrl: 'https://www.unifiedinfotech.net/',
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-page-load-more-cards',
  extractionStrategy: 'verified-first-party-careers-page+public-opening-cards+same-page-apply-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'unifiedinfotech.net',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.unifiedinfotech.net/careers/ was the live first-party Unified Infotech careers page, that it exposed public opening cards behind a Load More interface, and that the page included a first-party Apply For A Position form.',
  dryRunFile: 'unifiedinfotech/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

export const defaultFetchText = (url, {
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) => fetchTextWithRetry(url, {
  fetchImpl,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Jobify scraper)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs,
})

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Maximize Your Career &amp; Job Opportunities/i.test(page)
    && /Load More/i.test(page)
    && /Apply For A Position/i.test(page)
    && /read more/i.test(page)
}

export const extractJobCards = (html) => {
  const page = String(html ?? '')
  const jobs = []

  for (const match of page.matchAll(/<article class="job-card">([\s\S]*?)<\/article>/gi)) {
    const section = match[1]
    const title = normalizeWhitespace(section.match(/<h2>(.*?)<\/h2>/i)?.[1])
    const lines = [...section.matchAll(/<p>(.*?)<\/p>/gi)].map((item) => normalizeWhitespace(item[1])).filter(Boolean)
    const href = section.match(/<a[^>]*href=["']([^"']+)["']/i)?.[1]

    if (!title || lines.length < 3 || !href) continue

    const sourceUrl = new URL(href, CAREERS_URL).toString()
    jobs.push({
      title,
      remoteType: lines[0],
      employmentType: lines[1],
      location: lines[2],
      sourceUrl,
      applyUrl: sourceUrl,
    })
  }

  return jobs
}

export const run = async ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => {
  const page = await fetchText(CAREERS_URL)

  if (!hasOfficialCareersSignal(page)) {
    throw new Error('Unified Infotech verified first-party careers page changed materially')
  }

  const jobs = extractJobCards(page)
  if (!jobs.length) {
    throw new Error('Unified Infotech verified first-party careers page no longer exposes trusted job cards')
  }

  return jobs.map((job) => ({
    ...job,
    company: COMPANY,
    country: 'India',
    link: job.applyUrl || job.sourceUrl,
    source: SOURCE,
    scrapedAt: now(),
  }))
}
