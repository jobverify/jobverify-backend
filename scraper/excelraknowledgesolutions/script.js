import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { EXCELRA_KNOWLEDGE_SOLUTIONS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = EXCELRA_KNOWLEDGE_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_PORTAL_BASE_URL = PROVIDER_METADATA.careersPortalBaseUrl
export const CAREERS_WORDPRESS_API_URL = PROVIDER_METADATA.careersWordpressApiUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value = '') => String(value)
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/[\u201c\u201d\u2033]/g, '"')
  .replace(/[\u2018\u2019]/g, "'")

const stripTags = (value = '') => String(value).replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value = '') => decodeHtml(stripTags(value))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value).toLowerCase()
  if (!normalized) return null
  if (/full\s*time/.test(normalized)) return 'Full-time'
  if (/part\s*time/.test(normalized)) return 'Part-time'
  if (/contract/.test(normalized)) return 'Contract'
  if (/consultant/.test(normalized)) return 'Contract'
  return normalizeWhitespace(value)
}

const toApplicationUrl = (value) => {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.origin === 'https://excelra.darwinbox.in'
      && /^\/ms\/candidatev2\/main\/careers\/(?:allJobs\/?|jobDetails\/[^/]+)$/.test(url.pathname)
      && !url.username && !url.password ? url.toString() : null
  } catch { return null }
}

const parseLocation = (value) => {
  const location = normalizeWhitespace(value)
  const stateQualifiedIndia = /^Bengaluru,\s*Karnataka$/i.test(location)
  const country = /(?:^|,)\s*India\s*$/i.test(location) || stateQualifiedIndia ? 'India'
    : /(?:^|,)\s*(United States|United Kingdom|Germany|Singapore|Canada|Australia)\s*$/i.exec(location)?.[1] ?? null
  if (!country) throw Object.assign(new Error('Excelra incomplete location scope: ' + location), { code: 'incomplete_location_scope' })
  const parts = location.split(',').map(part => part.trim()).filter(Boolean)
  return { location, city: parts.length > 1 ? parts[0] : null, state: stateQualifiedIndia ? parts[1] : parts.length > 2 ? parts.slice(1, -1).join(', ') : null, country }
}

const applicationLinks = (html) => {
  const urls = []
  for (const match of html.matchAll(/\[nectar_btn\b[^\]]*\]/gi)) {
    if (!/\btext\s*=\s*["']Apply now["']/i.test(match[0])) continue
    urls.push(match[0].match(/\burl\s*=\s*["']([^"']*)["']/i)?.[1] ?? null)
  }
  for (const match of html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)) {
    if (!/^Apply now$/i.test(normalizeWhitespace(match[0]))) continue
    urls.push(match[0].match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1] ?? null)
  }
  return urls
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = decodeHtml(String(html))
  return /Excelra job opportunities/i.test(page)
    && /A more fulfilling career/i.test(page)
    && /Current openings/i.test(page)
    && applicationLinks(page).some(url => toApplicationUrl(url))
}

export const extractVisibleJobCards = (html = '') => {
  const page = decodeHtml(String(html))
  const heading = /<h2\b[^>]*>\s*Current openings\s*<\/h2>/i.exec(page)
  if (!heading) throw new Error('Excelra incomplete current openings section')
  const rest = page.slice(heading.index + heading[0].length)
  const section = rest.split(/<h2\b/i)[0]
  const headings = [...section.matchAll(/<h4\b[^>]*class=["']([^"']*)["'][^>]*>([\s\S]*?)<\/h4>/gi)]
    .filter(match => match[1].split(/\s+/).includes('custom-theme-color'))
  const expectedApplications = applicationLinks(section).length
  if (!headings.length || headings.length !== expectedApplications) throw new Error('Excelra incomplete public role cards')
  const seen = new Set()
  return headings.map((heading, index) => {
    const title = normalizeWhitespace(heading[2])
    const card = section.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? section.length)
    const fields = [...card.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)].map(match => normalizeWhitespace(match[1]))
    const employmentType = normalizeEmploymentType(fields[0])
    if (!title || !employmentType || !fields[1]) throw new Error('Excelra incomplete public role card')
    const locationDetails = parseLocation(fields[1])
    const experienceRequired = normalizeWhitespace(fields[2]) || null
    const urls = applicationLinks(card)
    const applyUrl = urls.length === 1 ? toApplicationUrl(urls[0]) : null
    if (!applyUrl) throw new Error('Excelra incomplete or invalid role application link')
    const jobId = (title + '-' + locationDetails.location).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    if (seen.has(jobId)) throw new Error('Excelra duplicate public role card')
    seen.add(jobId)
    const applicationUrlIsGeneric = /\/allJobs\/?$/.test(new URL(applyUrl).pathname)
    return {
      title, employmentType, experienceRequired, ...locationDetails,
      jobId, requisitionId: jobId, applicationUrlIsGeneric,
      sourceUrl: applicationUrlIsGeneric ? CAREERS_URL : applyUrl, applyUrl,
    }
  })
}

const buildJobDescription = (job) => [
  'Official Excelra careers-page opening for ' + job.title + '.',
  'Employment type: ' + job.employmentType + '.',
  'Location: ' + job.location + '.',
  job.experienceRequired ? 'Experience: ' + job.experienceRequired + '.' : null,
  'Applications route through the linked official Excelra careers portal.',
].filter(Boolean).join(' ')

const defaultFetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
  signal,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, { signal } = {}) => fetchJsonWithRetry(url, {
  signal,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const extractWordpressRenderedContent = (payload) => {
  const pages = Array.isArray(payload) ? payload : []
  const careersPage = pages.find((page) => page?.slug === 'careers' && page?.link === CAREERS_URL && page?.status === 'publish')
  return String(careersPage?.content?.rendered ?? '')
}

export const createExcelraKnowledgeSolutionsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchJson = defaultFetchJson,
    fetchText = defaultFetchText,
    signal,
  } = {}) {
    signal?.throwIfAborted()
    let careersHtml = ''

    try {
      const careersPayload = await fetchJson(CAREERS_WORDPRESS_API_URL, { signal })
      careersHtml = extractWordpressRenderedContent(careersPayload)
    } catch {
      signal?.throwIfAborted()
      careersHtml = await fetchText(CAREERS_URL, { signal })
    }
    signal?.throwIfAborted()

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Excelra Knowledge Solutions verified first-party careers page no longer matches the trusted contract')
    }

    const jobs = extractVisibleJobCards(careersHtml)
      .filter((job) => job.country === 'India')
      .map((job) => ({
        ...job,
        company: COMPANY,
        country: 'India',
        remoteStatus: null,
        jobDescription: buildJobDescription(job),
        source: SOURCE,
        link: job.applyUrl,
        scrapedAt: now(),
      }))
      .sort((left, right) => left.title.localeCompare(right.title))

    return jobs
  },
})

export const run = async (options = {}) => createExcelraKnowledgeSolutionsScraper(options).run(options)

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
