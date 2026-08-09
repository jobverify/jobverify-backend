import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defaultShouldUseBrowserNetworkFallback } from '../../scraper-support/shared/browserNetworkFallback.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { IRON_MOUNTAIN_INDIA_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const ABOUT_PAGE_URL = PROVIDER_METADATA.aboutPageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_SITEMAP_URL = PROVIDER_METADATA.jobsSitemapUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const capitalizeWord = (word) => {
  const normalized = String(word ?? '').trim().toLowerCase()
  if (!normalized) return ''
  return normalized[0].toUpperCase() + normalized.slice(1)
}

const uppercaseShortWord = (word) => {
  const normalized = String(word ?? '').trim().toLowerCase()
  if (!normalized) return ''
  if (/^[a-z]+$/.test(normalized) && normalized.length <= 3) {
    return normalized.toUpperCase()
  }

  return capitalizeWord(normalized)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

const shouldUseBrowserFallback = (error) =>
  defaultShouldUseBrowserNetworkFallback(error)

export const hasOfficialAboutPageCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Discover who we are \| Iron Mountain United States\s*<\/title>/i.test(page)
    && /<h1>\s*About Iron Mountain\s*<\/h1>/i.test(page)
    && /meta name=["']careers-board-domain["'] content=["']ironmountain\.jobs["']/i.test(page)
    && /href=["']\/company\/about\/careers["']/i.test(page)
    && text.includes('We protect what our customers value most.')
  }

export const hasOfficialJobsBoardSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Home \| Iron Mountain\s*<\/title>/i.test(page)
    && /<h1>\s*Search jobs\s*<\/h1>/i.test(page)
    && text.includes('Search jobs')
    && /"job-folder"\s*:\s*"ironmountain-jobs"/i.test(page)
    && /"x-origin"\s*:\s*"ironmountain\.jobs"/i.test(page)
}

const hasOfficialJobDetailSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Job \| Iron Mountain\s*<\/title>/i.test(page)
    && /"job-folder"\s*:\s*"ironmountain-jobs"/i.test(page)
    && /"x-origin"\s*:\s*"ironmountain\.jobs"/i.test(page)
    && /id=["']__NUXT_DATA__["']/i.test(page)
}

export const extractSitemapEntries = (xml = '') =>
  [...String(xml ?? '').matchAll(/<url>\s*<loc>\s*([^<]+)\s*<\/loc>\s*<lastmod>\s*([^<]+)\s*<\/lastmod>\s*<\/url>/gi)]
    .map((match) => ({
      url: match[1].trim(),
      lastmod: match[2].trim(),
    }))

export const isIndiaJobUrl = (url = '') => /https:\/\/ironmountain\.jobs\/[^/]+-ind\/[^/]+\/[A-Z0-9]+\/job\/?$/i.test(String(url))

export const humanizeTitleSlug = (slug = '') =>
  String(slug ?? '')
    .split('-')
    .filter(Boolean)
    .map(uppercaseShortWord)
    .join(' ')

export const formatIndiaLocationFromSlug = (slug = '') => {
  const baseSlug = String(slug ?? '').replace(/-ind$/i, '')
  const location = baseSlug
    .split('-')
    .filter(Boolean)
    .map(capitalizeWord)
    .join(' ')

  return location ? `${location}, India` : 'India'
}

const parseJobUrl = (url) => {
  try {
    const { pathname } = new URL(url)
    const [locationSlug, titleSlug, jobId, marker] = pathname.split('/').filter(Boolean)
    if (!locationSlug || !titleSlug || !jobId || marker !== 'job') return null
    return { locationSlug, titleSlug, jobId }
  } catch {
    return null
  }
}

export const mapSitemapEntryToJob = (entry = {}) => {
  if (!isIndiaJobUrl(entry.url)) return null

  const parsed = parseJobUrl(entry.url)
  if (!parsed) return null

  const location = formatIndiaLocationFromSlug(parsed.locationSlug)
  const city = location.replace(/,\s*India$/i, '')

  return {
    title: humanizeTitleSlug(parsed.titleSlug),
    company: COMPANY_NAME,
    department: null,
    location,
    city,
    country: 'India',
    jobId: parsed.jobId,
    requisitionId: parsed.jobId,
    sourceUrl: entry.url,
    applyUrl: entry.url,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: entry.lastmod || null,
    closingDate: null,
    jobDescription: null,
  }
}

export const createIronMountainIndiaScraper = ({
  now = () => new Date().toISOString(),
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchBrowserText,
  } = {}) {
    const loadText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (typeof fetchBrowserText === 'function' && shouldUseBrowserFallback(error)) {
          return fetchBrowserText(url)
        }

        throw error
      }
    }

    const aboutPageHtml = await loadText(ABOUT_PAGE_URL)
    if (!hasOfficialAboutPageCareersSignal(aboutPageHtml)) {
      throw new Error('Iron Mountain India verified about page changed materially')
    }

    const jobsBoardHtml = await loadText(CAREERS_URL)
    if (!hasOfficialJobsBoardSignal(jobsBoardHtml)) {
      throw new Error('Iron Mountain India verified jobs board changed materially')
    }

    const sitemapXml = await loadText(JOBS_SITEMAP_URL)
    const indiaEntries = extractSitemapEntries(sitemapXml).filter((entry) => isIndiaJobUrl(entry.url))
    const selectedEntries = Number.isInteger(maxJobs) ? indiaEntries.slice(0, maxJobs) : indiaEntries
    const scrapedAt = now()
    const jobs = []

    for (const entry of selectedEntries) {
      const detailHtml = await loadText(entry.url)
      if (!hasOfficialJobDetailSignal(detailHtml)) {
        throw new Error(`Iron Mountain India verified jobs board changed materially at ${entry.url}`)
      }

      const mappedJob = mapSitemapEntryToJob(entry)
      if (!mappedJob) continue

      jobs.push({
        ...mappedJob,
        publicExperienceChecked: true,
        link: mappedJob.applyUrl || mappedJob.sourceUrl,
        source: SOURCE,
        scrapedAt,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createIronMountainIndiaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
