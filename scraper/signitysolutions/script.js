export const SOURCE = 'signitysolutions'
export const COMPANY = 'Signity Solutions'
export const HOMEPAGE_URL = 'https://www.signitysolutions.com/'
export const CAREERS_URL = 'https://www.signitysolutions.com/careers'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Signity Solutions',
  adapter: 'script',
  modulePath: '../signitysolutions/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-page-current-openings-accordion',
  extractionStrategy: 'verified-careers-page+inline-opening-sections+career-form-anchor',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'signitysolutions.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.signitysolutions.com/careers was the live first-party Signity Solutions careers page and that it exposed inline public openings including Tech Lead and QA Lead with posting dates, Mohali location text, and the first-party #career-form apply anchor.',
  dryRunFile: 'signitysolutions/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Job Openings &amp; Career Opportunities at Signity Solutions/i.test(page)
    && /Current Openings/i.test(page)
    && /Apply for this job/i.test(page)
}

export const extractJobCards = (html) => {
  const page = String(html ?? '')
  const jobs = []

  for (const match of page.matchAll(/<div class="opening">([\s\S]*?)<\/div>/gi)) {
    const block = match[1]
    const title = normalizeWhitespace(block.match(/<h3>([^<]+)<\/h3>/i)?.[1])
    const location = normalizeWhitespace(block.match(/<span>Location<\/span>\s*<span>([^<]+)<\/span>/i)?.[1])

    if (!title || !location) continue

    jobs.push({
      title,
      location,
      sourceUrl: CAREERS_URL,
      applyUrl: `${CAREERS_URL}#career-form`,
    })
  }

  return jobs
}

export const run = async ({ fetchText, now = () => new Date().toISOString() } = {}) => {
  const page = await fetchText(CAREERS_URL)
  if (!hasOfficialCareersSignal(page)) {
    throw new Error('Signity Solutions verified careers page changed materially')
  }

  const jobs = extractJobCards(page)
  if (!jobs.length) {
    throw new Error('Signity Solutions careers page no longer exposes trusted openings')
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
