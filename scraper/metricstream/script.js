import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../utils/browser.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

import { METRICSTREAM_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = METRICSTREAM_CATALOG.source
export const COMPANY_NAME = METRICSTREAM_CATALOG.companyName
export const HOMEPAGE_URL = METRICSTREAM_CATALOG.homepageUrl
export const CAREERS_PAGE_URL = METRICSTREAM_CATALOG.companyCareerPage
export const SUCCESSFACTORS_BOARD_URL = METRICSTREAM_CATALOG.successFactorsBoardUrl
export const SUCCESSFACTORS_SEARCH_URL = METRICSTREAM_CATALOG.successFactorsSearchUrl
export const SUCCESSFACTORS_COMPANY_TOKEN = METRICSTREAM_CATALOG.successFactorsCompanyToken

const DEFAULT_TIMEOUT_MS = 120000
const DEFAULT_MAX_PAGES = 10
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toIsoDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (!match) return normalized

  const [, month, day, year] = match
  return `${year}-${month}-${day}`
}

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

const buildLocation = (city, country) => {
  const normalizedCity = normalizeWhitespace(city)
  const normalizedCountry = normalizeWhitespace(country)

  if (!normalizedCity && !normalizedCountry) return null
  if (!normalizedCity) return normalizedCountry
  if (!normalizedCountry) return normalizedCity
  return `${normalizedCity}, ${normalizedCountry}`
}

const firstMatch = (value, patterns) => {
  for (const pattern of patterns) {
    const match = String(value ?? '').match(pattern)
    if (match?.[1]) return normalizeWhitespace(match[1])
  }

  return null
}

const extractDialogValue = (rowHtml, label) => {
  const normalizedLabel = String(label ?? '').toLowerCase()

  for (const match of String(rowHtml ?? '').matchAll(
    /<span[^>]*class=["']jobMFieldContent["'][^>]*onclick=(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/span>/gi,
  )) {
    const onclick = match[2]
    const text = stripTags(match[3])?.toLowerCase() || ''

    if (!text.startsWith(normalizedLabel)) continue

    return firstMatch(onclick, [
      /\[\s*'([^']+)'/i,
      /\[\s*"([^"]+)"/i,
    ])
  }

  return null
}

const extractSectionHtml = (html, heading) => {
  const pattern = new RegExp(
    `<h2[^>]*>\\s*${heading}\\s*<\\/h2>\\s*([\\s\\S]*?)(?=<h2\\b|<\\/main>|<\\/body>)`,
    'i',
  )
  return String(html ?? '').match(pattern)?.[1] || ''
}

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const buildJobDescription = (html) => {
  const sections = []

  for (const heading of ['Job Description', 'Key Responsibilities', 'Requirements']) {
    const sectionText = stripTags(extractSectionHtml(html, heading))
    if (sectionText) {
      sections.push(`${heading}: ${sectionText}`)
    }
  }

  return sections.length > 0 ? sections.join('\n\n') : null
}

const buildRequiredSkills = (html) => {
  const skills = []

  for (const heading of ['Key Responsibilities', 'Requirements']) {
    skills.push(...extractListItems(extractSectionHtml(html, heading)))
  }

  return skills
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const buildDetailUrl = (requisitionId) =>
  `https://career5.successfactors.eu/career?career_ns=job_listing&company=${SUCCESSFACTORS_COMPANY_TOKEN}&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&career_job_req_id=${String(requisitionId)}&selected_lang=en_US&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta`

export const normalizeSuccessFactorsUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''), SUCCESSFACTORS_SEARCH_URL)
    url.searchParams.delete('_s.crb')

    const requisitionId = url.searchParams.get('career_job_req_id')
    if (requisitionId) return buildDetailUrl(requisitionId)

    return url.toString().replace('Asia%2FCalcutta', 'Asia/Calcutta')
  } catch {
    return String(value ?? '')
  }
}

export const extractSuccessFactorsHandoffUrl = (html) => {
  const match = String(html ?? '').match(/href=["'](https:\/\/career5\.successfactors\.eu\/career\?company=metricstre)["']/i)
  return match?.[1] || null
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = stripTags(rawHtml) || ''

  return /<title>\s*GRC\s*\|\s*Governance,\s*Risk and Compliance Software Solutions\s*<\/title>/i.test(rawHtml)
    && /about-us\/careers\.htm/i.test(rawHtml)
    && /connected grc/i.test(normalized)
}

export const hasOfficialCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = stripTags(rawHtml) || ''

  return /<title>\s*Careers\s*&\s*Job Opportunities\s*-\s*MetricStream\s*<\/title>/i.test(rawHtml)
    && /search open positions/i.test(normalized)
    && /career5\.successfactors\.eu\/career\?company=metricstre/i.test(rawHtml)
}

export const hasSuccessFactorsSearchPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = stripTags(rawHtml) || ''

  return /<title>\s*Career Opportunities\s*<\/title>/i.test(rawHtml)
    && /Search for Openings/i.test(normalized)
    && /Jobs matched your search/i.test(normalized)
    && /class=["']jobResultItem["']/i.test(rawHtml)
    && /company=metricstre/i.test(rawHtml)
}

export const extractSearchSummary = (html) => {
  const normalized = stripTags(html) || ''
  const totalMatch = normalized.match(/(\d+)\s+Jobs?\s+matched your search/i)
  const pageMatch = normalized.match(/Page\s+(\d+)\s+of\s+(\d+)/i)
  const pageSizeMatch = normalized.match(/Items per page\s+(\d+)/i)

  return {
    totalJobs: totalMatch ? Number.parseInt(totalMatch[1], 10) : null,
    currentPage: pageMatch ? Number.parseInt(pageMatch[1], 10) : null,
    totalPages: pageMatch ? Number.parseInt(pageMatch[2], 10) : null,
    pageSize: pageSizeMatch ? Number.parseInt(pageSizeMatch[1], 10) : null,
  }
}

const parseSearchRow = (rowHtml) => {
  const title = stripTags(rowHtml.match(/<a[^>]*class=["']jobTitle["'][^>]*>([\s\S]*?)<\/a>/i)?.[1] || '')
  const href = rowHtml.match(/<a[^>]*class=["']jobTitle["'][^>]*href=["']([^"']+)["']/i)?.[1] || null
  const values = [...String(rowHtml ?? '').matchAll(/<span[^>]*class=["']jobContentEM["'][^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

  const requisitionId = normalizeWhitespace(values[0])
  const postingDate = toIsoDate(String(values[1] ?? '').replace(/^Posted on\s*/i, ''))
  const department = normalizeWhitespace(values[2])
  const country = extractDialogValue(rowHtml, 'Country')
  const city = extractDialogValue(rowHtml, 'City')

  if (!title || !requisitionId || !country || !city) return null

  const canonicalUrl = requisitionId ? buildDetailUrl(requisitionId) : normalizeSuccessFactorsUrl(href)

  return {
    title,
    department,
    location: buildLocation(city, country),
    city,
    country,
    jobId: requisitionId,
    requisitionId,
    sourceUrl: canonicalUrl,
    applyUrl: canonicalUrl,
    postingDate,
  }
}

export const extractSearchResults = (html) => {
  const rows = []

  for (const match of String(html ?? '').matchAll(/<tr[^>]*class=["']jobResultItem["'][^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = parseSearchRow(match[1])
    if (row) rows.push(row)
  }

  return rows
}

export const hasOfficialJobDetailSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = stripTags(rawHtml) || ''

  return /<title>\s*Career Opportunities:/i.test(rawHtml)
    && /checkDpcs2AndProceed/i.test(rawHtml)
    && /Requisition ID\s*[0-9]+/i.test(normalized)
}

export const extractJobDetail = (html, listing = {}) => {
  if (!hasOfficialJobDetailSignal(html)) {
    throw new Error('MetricStream verified public SuccessFactors detail surface changed materially')
  }

  const rawHtml = String(html ?? '')
  const bodyText = stripTags(rawHtml) || ''
  const rawTitle = stripTags(rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || listing.title || '')
  const title = normalizeWhitespace(
    rawTitle
      .replace(/^Career Opportunities:\s*/i, '')
      .replace(/\s*\([0-9]+\)\s*$/i, ''),
  ) || listing.title || null
  const requisitionId = normalizeWhitespace(
    bodyText.match(/\bRequisition ID\s*([0-9]+)\b/i)?.[1] || listing.requisitionId || listing.jobId,
  )
  const postingDate = toIsoDate(
    bodyText.match(/\bPosted\s*([0-9/]{10})\b/i)?.[1] || listing.postingDate,
  )
  const sourceUrl = listing.sourceUrl || buildDetailUrl(requisitionId || listing.jobId)

  return {
    title,
    department: listing.department || null,
    location: listing.location || null,
    city: listing.city || null,
    country: listing.country || null,
    jobId: requisitionId || listing.jobId || null,
    requisitionId: requisitionId || listing.requisitionId || listing.jobId || null,
    employmentType: null,
    experienceRequired: null,
    jobDescription: buildJobDescription(rawHtml) || listing.jobDescription || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: buildRequiredSkills(rawHtml),
    postingDate,
    applyUrl: sourceUrl,
    sourceUrl,
  }
}

const getLiveSearchPages = async ({
  searchUrl = SUCCESSFACTORS_SEARCH_URL,
  maxPages = DEFAULT_MAX_PAGES,
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const page = await createOptimizedPageImpl(browser)
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT_MS })
    await page.waitForFunction(() => document.querySelector('tr.jobResultItem'), { timeout: DEFAULT_TIMEOUT_MS })

    const pages = []

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
      await page.waitForTimeout(1000)
      pages.push(await page.content())

      const nextCount = await page.locator('a[title="Next Page"]').count()
      if (nextCount === 0) break

      const next = page.locator('a[title="Next Page"]').first()
      const className = await next.getAttribute('class')
      if (className?.includes('disabled')) break

      const firstReqId = await page.locator('tr.jobResultItem .jobContentEM').first().textContent()
      await next.click()
      await page.waitForFunction(
        (previousReqId) => {
          const currentReqId = document.querySelector('tr.jobResultItem .jobContentEM')?.textContent?.trim() || null
          return currentReqId && currentReqId !== previousReqId
        },
        (firstReqId || '').trim(),
        { timeout: DEFAULT_TIMEOUT_MS },
      )
    }

    return pages
  } finally {
    await browser.close()
  }
}

export const createMetricStreamScraper = ({
  fetchText = defaultFetchText,
  getSearchPages = (options = {}) => getLiveSearchPages(options),
  now = () => new Date().toISOString(),
  maxPages = DEFAULT_MAX_PAGES,
} = {}) => ({
  async run() {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('MetricStream verified official homepage changed materially')
    }

    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('MetricStream verified official careers page changed materially')
    }

    const handoffUrl = extractSuccessFactorsHandoffUrl(careersHtml)
    if (!sameUrl(handoffUrl, SUCCESSFACTORS_BOARD_URL)) {
      throw new Error('MetricStream verified official careers page no longer exposes the known SuccessFactors handoff')
    }

    const searchPages = await getSearchPages({
      searchUrl: SUCCESSFACTORS_SEARCH_URL,
      maxPages,
    })

    if (!Array.isArray(searchPages) || searchPages.length === 0 || !hasSuccessFactorsSearchPageSignal(searchPages[0])) {
      throw new Error('MetricStream verified public SuccessFactors search surface changed materially')
    }

    const seenIds = new Set()
    const indiaListings = []

    for (const pageHtml of searchPages) {
      for (const listing of extractSearchResults(pageHtml)) {
        if (!/india/i.test(String(listing.country ?? ''))) continue
        if (seenIds.has(listing.requisitionId)) continue
        seenIds.add(listing.requisitionId)
        indiaListings.push(listing)
      }
    }

    const scrapedAt = now()
    const jobs = []

    for (const listing of indiaListings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        title: detail.title || listing.title,
        company: COMPANY_NAME,
        department: detail.department || listing.department,
        location: detail.location || listing.location,
        city: detail.city || listing.city,
        country: detail.country || listing.country,
        link: detail.applyUrl || detail.sourceUrl || listing.sourceUrl,
        applyUrl: detail.applyUrl || listing.applyUrl,
        sourceUrl: detail.sourceUrl || listing.sourceUrl,
        source: SOURCE,
        jobId: detail.jobId || listing.jobId,
        requisitionId: detail.requisitionId || listing.requisitionId,
        employmentType: detail.employmentType,
        experienceRequired: detail.experienceRequired,
        jobDescription: detail.jobDescription,
        minimumQualification: detail.minimumQualification,
        preferredQualification: detail.preferredQualification,
        requiredSkills: detail.requiredSkills,
        postingDate: detail.postingDate || listing.postingDate,
        scrapedAt,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createMetricStreamScraper(options).run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
