import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'fingent'
export const COMPANY = 'Fingent'
export const HOMEPAGE_URL = 'https://www.fingent.com/careers/'
export const CAREERS_URL = 'https://www.fingent.com/careers/career-openings/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Fingent',
  adapter: 'script',
  modulePath: '../fingent/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-first-party-openings-page',
  countryFilter: 'India',
  paginationStrategy: 'single-page-searchable-list',
  extractionStrategy: 'verified-first-party-openings-page+same-page-role-links+public-title-and-experience',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'fingent.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.fingent.com/careers/career-openings/ was the live first-party Fingent openings page, and that it publicly exposed current opening links such as Accounts Executive [Contract Role], Associate Technical Lead – .NET, Senior Software Engineer .NET, DevOps Engineer, and Data Engineer with experience ranges in the visible listing text.',
  dryRunFile: 'fingent/jobs.json',
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
  return page.includes('Explore Our Current Openings')
    && page.includes('Accounts Executive [Contract Role] 1 - 3 Years')
    && page.includes('Associate Technical Lead')
}

export const extractOpenings = (html = '') => {
  const page = String(html ?? '')
  const jobs = []

  for (const match of page.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = new URL(match[1], CAREERS_URL).toString()
    const text = normalizeWhitespace(match[2])
    const detail = text.match(/^(.*?)\s+(\d[\d+\s-]*Years?)$/i)
    if (!detail) continue

    jobs.push({
      title: detail[1].trim(),
      experience: detail[2].trim(),
      location: null,
      sourceUrl: href,
      applyUrl: href,
    })
  }

  return jobs
}

export const run = async ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => {
  const careersHtml = await fetchText(CAREERS_URL)
  if (!hasOfficialCareersSignal(careersHtml)) {
    throw new Error('Fingent verified first-party openings page changed materially')
  }

  const jobs = extractOpenings(careersHtml)
  if (!jobs.length) {
    throw new Error('Fingent verified first-party openings page no longer exposes public roles')
  }

  return jobs.map((job) => ({
    ...job,
    company: COMPANY,
    country: 'India',
    link: job.applyUrl,
    source: SOURCE,
    scrapedAt: now(),
  }))
}
