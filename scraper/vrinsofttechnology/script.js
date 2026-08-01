import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'vrinsofttechnology'
export const COMPANY = 'Vrinsoft Technology'
export const CAREERS_URL = 'https://www.vrinsofts.com/career.html'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Vrinsoft',
  adapter: 'script',
  modulePath: '../vrinsofttechnology/script.js',
  homepageUrl: 'https://www.vrinsofts.com/',
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-page',
  extractionStrategy: 'verified-first-party-careers-page+same-page-job-cards+apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'vrinsofts.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.vrinsofts.com/career.html was the live first-party Vrinsoft careers page, and that the page exposed public developer and engineer hiring signals plus first-party Apply Now job links.',
  dryRunFile: 'vrinsofttechnology/jobs.json',
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
  return /Vrinsoft Careers \| Jobs in AI, Web &amp; Software Development/i.test(page)
    && /Apply Now/i.test(page)
    && /Developer|Engineer/i.test(page)
}

export const extractJobCards = (html) => {
  const page = String(html ?? '')
  const jobs = []

  for (const match of page.matchAll(/<div class="job-card">([\s\S]*?)<\/div>/gi)) {
    const section = match[1]
    const title = normalizeWhitespace(section.match(/<h2>(.*?)<\/h2>/i)?.[1])
    const location = normalizeWhitespace(section.match(/<span>(.*?)<\/span>/i)?.[1])
    const href = section.match(/<a[^>]*href=["']([^"']+)["']/i)?.[1]

    if (!title || !location || !href) continue

    const sourceUrl = new URL(href, CAREERS_URL).toString()
    jobs.push({
      title,
      location,
      sourceUrl,
      applyUrl: sourceUrl,
    })
  }

  return jobs
}

export const run = async ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => {
  const page = await fetchText(CAREERS_URL)

  if (!hasOfficialCareersSignal(page)) {
    throw new Error('Vrinsoft Technology verified first-party careers page changed materially')
  }

  const jobs = extractJobCards(page)
  if (!jobs.length) {
    throw new Error('Vrinsoft Technology verified first-party careers page no longer exposes trusted job cards')
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
