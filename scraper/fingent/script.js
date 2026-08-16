import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'fingent'
export const COMPANY = 'Fingent'
export const HOMEPAGE_URL = 'https://www.fingent.com/careers/'
export const CAREERS_URL = 'https://www.fingent.com/careers/career-openings/'
export const VERIFIED_AT = '2026-08-14'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Fingent',
  adapter: 'script',
  modulePath: '../../scraper/fingent/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-first-party-openings-page',
  countryFilter: 'India',
  paginationStrategy: 'single-page-searchable-list',
  extractionStrategy: 'verified-first-party-openings-page+careers-jobs-links+public-title-and-experience',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'fingent.com',
  verifiedOn: VERIFIED_AT,
  verifiedSurfaceSummary:
    'Verified on Friday, August 14, 2026 that https://www.fingent.com/careers/ remained the live Fingent careers home with title "Home - Fingent Careers", and that https://www.fingent.com/careers/career-openings/ remained the live first-party Fingent openings page with title "Career Openings - Fingent Careers". The page publicly exposed /careers/jobs/ links such as Senior Consultant - Magento (Contract), Junior DevOps Engineer/DevOps Engineer, Associate Technical Lead - .NET, Senior Software Engineer .NET, and Data Engineer with visible experience ranges in the listing text.',
  dryRunFile: 'fingent/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#8211;|&ndash;|&#x2013;|–/gi, ' - ')
  .replace(/&#8212;|&mdash;|&#x2014;|—/gi, ' - ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
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
  const text = normalizeWhitespace(page)

  return /<title>\s*Career Openings\s*-\s*Fingent Careers\s*<\/title>/i.test(page)
    && text.includes('Explore Our Current Openings')
    && /open-positions\s+careeropenings/i.test(page)
}

export const extractOpenings = (html = '') => {
  const page = String(html ?? '')
  const jobs = []

  for (const match of page.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = new URL(match[1], CAREERS_URL).toString()
    if (!/\/careers\/jobs\//i.test(href)) continue

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
