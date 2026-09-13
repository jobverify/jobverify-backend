import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'airindia'
export const COMPANY = 'Air India'
export const CAREERS_URL = 'https://careers.airindia.com/go/'
export const SEARCH_URL = 'https://careers.airindia.com/search/?createNewAlert=false&q=&optionsFacetsDD_dept=&optionsFacetsDD_department='
export const DISPOSITION = 'live-first-party-successfactors-inventory'
export const VERIFIED_ON = '2026-09-13'
export const VERIFIED_SURFACE_SUMMARY = 'Verified on Sunday, September 13, 2026 that Air India publishes its complete public vacancy inventory on the first-party SuccessFactors search surface linked by SHOW ALL OPENINGS from https://careers.airindia.com/go/.'

const decodeHtml = (value = '') => String(value)
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized || null
}

const getAttribute = (attributes, name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return decodeHtml(
    new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(attributes)?.[2] || '',
  ) || null
}

const toOfficialUrl = (value, baseUrl = CAREERS_URL) => {
  try {
    const url = new URL(decodeHtml(value), baseUrl)
    return url.protocol === 'https:' && url.origin === new URL(CAREERS_URL).origin
      ? url.toString()
      : null
  } catch {
    return null
  }
}

const extractJobId = (url) => /\/(\d+)\/?(?:[?#].*)?$/.exec(String(url || ''))?.[1] || null

const extractField = (row, fieldName) => normalizeWhitespace(
  new RegExp(
    `<(?:div|span)\\b[^>]*id=["'][^"']*-section-${fieldName}-value["'][^>]*>([\\s\\S]*?)<\\/(?:div|span)>`,
    'i',
  ).exec(row)?.[1],
)

const normalizeIndiaLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location || /^\.?\s*(?:,\s*IN)?$/i.test(location)) return 'India'
  if (/\b(?:India|IN)\b/i.test(location)) return location.replace(/,?\s*IN\b/i, ', India')
  return `${location}, India`
}

const getCity = (location) => {
  const city = String(location || '').split(',')[0]?.trim()
  return city && !/^India$/i.test(city) ? city : null
}

export const extractAirIndiaOpeningLinks = (html) => {
  const links = []
  const seen = new Set()

  for (const match of String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attributes = match[1]
    const label = [getAttribute(attributes, 'title'), normalizeWhitespace(match[2])]
      .filter(Boolean)
      .join(' ')
    if (!/show all openings/i.test(label)) continue

    const url = toOfficialUrl(getAttribute(attributes, 'href'))
    if (!url || new URL(url).pathname !== '/search/' || seen.has(url)) continue
    seen.add(url)
    links.push(url)
  }

  return links
}

export const extractAirIndiaSearchResults = (html) => {
  const page = String(html || '')
  if (!/Air India Careers Jobs/i.test(page)) {
    throw new Error('Air India official search surface changed materially')
  }

  const label = normalizeWhitespace(
    /<span\b[^>]*id=["']tile-search-results-label["'][^>]*>([\s\S]*?)<\/span>/i.exec(page)?.[1],
  )
  const summaryMatch = /Showing\s+([\d,]+)\s+to\s+([\d,]+)\s+of\s+([\d,]+)\s+Jobs/i.exec(label || '')
  const explicitEmpty = /there are currently no open positions|0 most recent jobs posted by Air India Careers/i.test(page)
  if (!summaryMatch && !explicitEmpty) {
    throw new Error('Air India official search pagination contract changed materially')
  }

  const rows = [...page.matchAll(/<li\b[^>]*class=["'][^"']*\bjob-tile\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)]
  const jobs = rows.map((rowMatch) => {
    const row = rowMatch[1]
    const linkMatch = /<a\b(?=[^>]*class=["'][^"']*\bjobTitle-link\b[^"']*["'])(?=[^>]*href=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/a>/i.exec(row)
    const sourceUrl = toOfficialUrl(linkMatch?.[1], SEARCH_URL)
    const jobId = extractJobId(sourceUrl)
    const title = normalizeWhitespace(linkMatch?.[2])
    const location = normalizeIndiaLocation(extractField(row, 'city'))
    const requisitionId = extractField(row, 'customfield1') || jobId
    const department = extractField(row, 'dept')

    if (!sourceUrl || !jobId || !title || !location || !requisitionId) {
      throw new Error('Air India official job tile changed materially or exposed an unsafe URL')
    }

    return {
      title,
      company: COMPANY,
      location,
      city: getCity(location),
      country: 'India',
      link: sourceUrl,
      applyUrl: sourceUrl,
      sourceUrl,
      source: SOURCE,
      jobId,
      requisitionId,
      department,
      employmentType: null,
      jobDescription: null,
      remoteStatus: 'On-site',
      atsPlatform: 'successfactors',
      companyCareerPage: CAREERS_URL,
      sourceListingComplete: true,
      publicExperienceChecked: false,
    }
  })

  if (explicitEmpty && jobs.length === 0) {
    return { jobs, start: 0, end: 0, total: 0 }
  }

  const [start, end, total] = summaryMatch.slice(1).map((value) => (
    Number.parseInt(value.replace(/,/g, ''), 10)
  ))
  const returned = Number.parseInt(
    /<ul\b[^>]*id=["']job-tile-list["'][^>]*data-record-returned=["'](\d+)["']/i.exec(page)?.[1] || '',
    10,
  )
  if (![start, end, total, returned].every(Number.isSafeInteger)
    || returned !== jobs.length
    || end - start + 1 !== jobs.length
    || end > total) {
    throw new Error('Air India official search result count changed materially or is incomplete')
  }

  return { jobs, start, end, total }
}

const defaultFetchHtml = async (url, { signal } = {}) => {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (compatible; Jobverify Air India scraper)',
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createAirIndiaScraper = ({
  fetchHtml = defaultFetchHtml,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ signal = null, maxPages = 50 } = {}) {
    signal?.throwIfAborted()
    const landingHtml = await fetchHtml(CAREERS_URL, { signal })
    signal?.throwIfAborted()
    if (!/Air India/i.test(landingHtml) || !/CURRENT OPENINGS/i.test(landingHtml)) {
      throw new Error('Air India official current-openings surface changed materially')
    }

    const [inventoryUrl] = extractAirIndiaOpeningLinks(landingHtml)
    if (!inventoryUrl) {
      throw new Error('Air India official current-openings handoff changed materially')
    }

    const jobs = []
    const seen = new Set()
    let nextUrl = inventoryUrl
    let expectedStart = 1
    let reportedTotal = null
    let pagesFetched = 0

    while (nextUrl && pagesFetched < maxPages) {
      const pageHtml = await fetchHtml(nextUrl, { signal })
      signal?.throwIfAborted()
      const page = extractAirIndiaSearchResults(pageHtml)
      pagesFetched += 1
      reportedTotal ??= page.total

      if (page.total !== reportedTotal || (page.total > 0 && page.start !== expectedStart)) {
        throw new Error('Air India official search pagination changed materially or is incomplete')
      }

      for (const job of page.jobs) {
        if (seen.has(job.jobId)) {
          throw new Error('Air India official search pagination repeated a job and is incomplete')
        }
        seen.add(job.jobId)
        jobs.push(job)
      }

      if (page.end >= page.total) {
        nextUrl = null
        break
      }
      expectedStart = page.end + 1
      const url = new URL(inventoryUrl)
      url.searchParams.set('startrow', String(page.end))
      nextUrl = url.toString()
    }

    if (nextUrl || reportedTotal == null || jobs.length !== reportedTotal) {
      throw new Error('Air India official search inventory is incomplete')
    }

    const verifiedAt = now()
    for (const job of jobs) job.scrapedAt = verifiedAt
    return attachInventoryEvidence(jobs, {
      status: jobs.length === 0 ? 'verified-empty' : 'complete-inventory',
      surface: inventoryUrl,
      firstParty: true,
      listingComplete: true,
      pagesFetched,
      reportedTotal,
      indiaFacetCount: jobs.length,
      verifiedAt,
      reason: jobs.length === 0
        ? 'verified-air-india-successfactors-empty'
        : 'complete-air-india-successfactors-inventory',
    })
  },
})

export const run = async (options = {}) => createAirIndiaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
