import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'pena4techsolutions'
export const COMPANY = 'Pena4 Tech Solutions'
export const JOBS_URL = 'https://www.pena4.com/jobs.php'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Pena4',
  adapter: 'script',
  modulePath: '../pena4techsolutions/script.js',
  homepageUrl: 'https://www.pena4.com/',
  companyCareerPage: JOBS_URL,
  atsPlatform: 'official-first-party-jobs-page',
  countryFilter: 'India',
  paginationStrategy: 'single-page-region-tabs',
  extractionStrategy: 'verified-first-party-jobs-page+india-region-filter+same-page-application-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'pena4.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.pena4.com/jobs.php was the live first-party Pena4 jobs page, that it publicly exposed the Inpatient Medical Coder listing alongside region-specific vacancy messaging, and that the page included a first-party application form plus outbound Indeed and LinkedIn job links.',
  dryRunFile: 'pena4techsolutions/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialJobsPageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Jobs at Pena4 \| Join Our Team\s*<\/title>/i.test(page)
    && /Submit your resume and become a part of our team/i.test(page)
    && /View jobs on indeed/i.test(page)
    && /View jobs on linkedin/i.test(page)
    && /Job Application Form|Apply Now/i.test(page)
}

export const extractJobCards = (html) => {
  const page = String(html ?? '')
  const cards = []

  for (const match of page.matchAll(/<section class="job-card">([\s\S]*?)<\/section>/gi)) {
    const section = match[1]
    const title = normalizeWhitespace(section.match(/<h3>(.*?)<\/h3>/i)?.[1])
    const description = normalizeWhitespace(section.match(/Description:\s*([^<]+)/i)?.[1])

    if (!title || !description) continue

    cards.push({
      title,
      location: 'India',
      employmentType: /full time and part time/i.test(section) ? 'Full Time or Part Time' : null,
      remoteType: /100%\s*remote/i.test(section) ? 'Remote' : null,
      sourceUrl: JOBS_URL,
      applyUrl: JOBS_URL,
      jobDescription: description,
    })
  }

  return cards
}

export const run = async ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => {
  const page = await fetchText(JOBS_URL)

  if (!hasOfficialJobsPageSignal(page)) {
    throw new Error('Pena4 Tech Solutions verified first-party jobs page changed materially')
  }

  const jobs = extractJobCards(page)
  if (!jobs.length) {
    throw new Error('Pena4 Tech Solutions verified first-party jobs page no longer exposes trusted openings')
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
