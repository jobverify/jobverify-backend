import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { AURIGO_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = AURIGO_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const SEARCH_RESULTS_URL = PROVIDER_METADATA.searchResultsUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const decodeHref = (value) => String(value ?? '').replace(/&amp;/gi, '&')

const toAbsoluteUrl = (value) => {
  try {
    const url = new URL(value, SEARCH_RESULTS_URL)
    if (url.hostname !== 'careers.aurigo.com') return null
    return url.toString()
  } catch {
    return null
  }
}

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const parsePostingDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/)
  if (!match) return null

  const monthLookup = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
  }

  const month = monthLookup[match[1]]
  const day = String(Number.parseInt(match[2], 10)).padStart(2, '0')
  return month ? `${match[3]}-${month}-${day}` : null
}

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
  const normalized = normalizeWhitespace(page)
  return /<title>\s*Aurigo Software Technologies Jobs\s*<\/title>/i.test(page)
    && normalized.includes('Search results for "".')
    && normalized.includes('Results')
    && (
      page.includes('https://careers.aurigo.com/job/')
      || page.includes('href="/job/')
    )
    && /id=["']searchresults["']|class=["'][^"']*searchResults[^"']*["']/i.test(page)
}

export const extractNextPageUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']*startrow=\d+[^"']*)["']/gi)) {
    const url = toAbsoluteUrl(decodeHref(match[1]))
    if (url) return url
  }
  return null
}

export const extractJobs = (html = '') => {
  const jobs = []

  for (const match of String(html ?? '').matchAll(/<tr[^>]*class=["'][^"']*data-row[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)) {
    const block = match[1]
    const url = toAbsoluteUrl(decodeHref(block.match(/<a[^>]*href=["']([^"']+)["']/i)?.[1]))
    const title = normalizeWhitespace(block.match(/<a[^>]*class=["'][^"']*jobTitle-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)?.[1])
    const region = normalizeWhitespace(block.match(/<td[^>]*class=["'][^"']*colLocation[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*jobLocation[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1])
    const postingDate = parsePostingDate(
      block.match(/<span[^>]*class=["'][^"']*jobDate[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1],
    )

    if (!url || !title || region !== 'IN') continue

    const urlParts = new URL(url).pathname.split('/').filter(Boolean)
    const derivedId = slugify(`${urlParts[urlParts.length - 2] || title}-${urlParts[urlParts.length - 1] || ''}`)

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: derivedId,
      requisitionId: derivedId,
      sourceUrl: url,
      applyUrl: url,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    })
  }

  if (jobs.length > 0) {
    return jobs
  }

  for (const match of String(html ?? '').matchAll(/<div[^>]*class=["'][^"']*job[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    const block = match[1]
    const url = toAbsoluteUrl(decodeHref(block.match(/<a[^>]*href=["']([^"']+)["']/i)?.[1]))
    const title = normalizeWhitespace(block.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1])
    const spans = [...block.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)].map((item) => normalizeWhitespace(item[1]))
    const region = spans[0] || null
    const postingDate = parsePostingDate(spans[1])

    if (!url || !title || region !== 'IN') continue

    const urlParts = new URL(url).pathname.split('/').filter(Boolean)
    const derivedId = slugify(`${urlParts[urlParts.length - 2] || title}-${urlParts[urlParts.length - 1] || ''}`)

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: derivedId,
      requisitionId: derivedId,
      sourceUrl: url,
      applyUrl: url,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    })
  }

  return jobs
}

export const createAurigoScraper = ({ maxPages = 2, maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const requested = new Set()
    const jobs = []
    let nextUrl = SEARCH_RESULTS_URL
    let pageCount = 0

    while (nextUrl && pageCount < maxPages && !requested.has(nextUrl)) {
      requested.add(nextUrl)
      const html = await fetchText(nextUrl)
      if (!hasOfficialCareersSignal(html)) {
        throw new Error('The verified Aurigo search surface no longer matches the trusted first-party jobs pages')
      }

      jobs.push(...extractJobs(html))
      nextUrl = pageCount === 0 ? extractNextPageUrl(html) : null
      pageCount += 1
    }

    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createAurigoScraper().run(options)

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
