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
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://logelite.com/career/ was the live first-party Logelite careers page, and that it publicly exposed role cards such as Human Resource Executive, Business Development Manager, and Sales & Support Executive with Lucknow location text plus Download Details and Apply Now links.',
  dryRunFile: 'logelite/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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
  return page.includes('Open Job Positions')
    && page.includes('Your Career Starts Here')
    && page.includes('Human Resource Executive')
    && page.includes('Apply Now')
}

export const extractJobCards = (html = '') => {
  const page = String(html ?? '')
  const jobs = []

  for (const match of page.matchAll(/<section>([\s\S]*?)<\/section>/gi)) {
    const block = match[1]
    const title = normalizeWhitespace(block.match(/<h3>([\s\S]*?)<\/h3>/i)?.[1])
    const lines = [...block.matchAll(/<p>([\s\S]*?)<\/p>/gi)]
      .map((item) => normalizeWhitespace(item[1]))
      .filter(Boolean)
    const links = [...block.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .map((item) => ({
        href: new URL(item[1], CAREERS_URL).toString(),
        label: normalizeWhitespace(item[2]),
      }))

    if (!title || lines.length < 4) continue

    const detailUrl = links.find((item) => item.label === 'Download Details')?.href ?? CAREERS_URL
    const applyUrl = links.find((item) => item.label === 'Apply Now')?.href ?? CAREERS_URL

    jobs.push({
      title,
      openings: lines[0].replace(/^Total Openings\s*/i, '').trim(),
      location: /india/i.test(lines[1]) ? lines[1] : `${lines[1]}, India`,
      compensation: lines[2],
      description: lines[3],
      sourceUrl: detailUrl,
      applyUrl,
    })
  }

  return jobs
}

export const run = async ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => {
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
    location: job.location,
    openings: job.openings,
    compensation: job.compensation,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    company: COMPANY,
    country: 'India',
    link: job.applyUrl,
    source: SOURCE,
    scrapedAt: now(),
  }))
}
