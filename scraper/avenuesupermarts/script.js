import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'

import { AVENUE_SUPERMARTS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = AVENUE_SUPERMARTS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const SUCCESSFACTORS_BOARD_URL = PROVIDER_METADATA.successFactorsBoardUrl
export const SUCCESSFACTORS_SEARCH_URL = PROVIDER_METADATA.successFactorsSearchUrl
export const SUCCESSFACTORS_COMPANY_TOKEN = PROVIDER_METADATA.successFactorsCompanyToken
export const DETAIL_URL_PREFIX = `https://career10.successfactors.com/career?career_ns=job_listing&company=${SUCCESSFACTORS_COMPANY_TOKEN}&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB`

const DEFAULT_TIMEOUT_MS = 120000
const DEFAULT_MAX_PAGES = 10

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
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toIsoDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (!match) return normalized

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

export const buildDetailUrl = (requisitionId) =>
  `${DETAIL_URL_PREFIX}&career_job_req_id=${encodeURIComponent(String(requisitionId))}&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta`

export const buildSearchUrl = () => SUCCESSFACTORS_SEARCH_URL

export const extractSuccessFactorsHandoffUrl = (html) => {
  const match = String(html ?? '').match(/href=["'](https:\/\/career10\.successfactors\.com\/career\?company=avenuesupe)["']/i)
  return match ? match[1] : null
}

export const hasOfficialCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const hasKnownTitle = /<title>\s*Careers\s*\|\s*DMart\s*<\/title>/i.test(rawHtml)
  const hasLegacyCareersCopy = /DMart is constantly expanding/i.test(normalized || '')
    && /CURRENT OPENINGS/i.test(normalized || '')
    && /Explore our current openings below\. Good Luck!/i.test(normalized || '')
  const hasCurrentFirstPartyNav = /About us/i.test(normalized || '')
    && /Partner with us/i.test(normalized || '')
    && /Investor Relations/i.test(normalized || '')

  return hasKnownTitle
    && (hasLegacyCareersCopy || hasCurrentFirstPartyNav)
}

export const hasSuccessFactorsSearchPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  return /<title>\s*Career Opportunities\s*<\/title>/i.test(rawHtml)
    && /class="jobResultItem"/i.test(rawHtml)
    && new RegExp(`company=${SUCCESSFACTORS_COMPANY_TOKEN}`, 'i').test(rawHtml)
}

const hasNextPage = (html) => /<a[^>]+title="Next Page"[^>]*>/i.test(String(html ?? ''))

const buildLocation = ({ city, state }) => {
  const parts = [normalizeWhitespace(city), normalizeWhitespace(state), 'India'].filter(Boolean)
  return parts.join(', ') || 'India'
}

const parseRow = (rowHtml) => {
  const title = stripTags(rowHtml.match(/<a[^>]*class="jobTitle"[^>]*>([\s\S]*?)<\/a>/i)?.[1] || '')
  const values = [...String(rowHtml ?? '').matchAll(/<span class="jobContentEM">([\s\S]*?)<\/span>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

  const requisitionId = normalizeWhitespace(values[0])
  const postingDate = toIsoDate(String(values[1] ?? '').replace(/^Posted on\s*/i, ''))
  const hiringEntity = normalizeWhitespace(values[2])
  const state = normalizeWhitespace(values[3])
  const city = normalizeWhitespace(values[4])
  const department = normalizeWhitespace(values[5])

  if (!title || !requisitionId) return null

  const detailUrl = buildDetailUrl(requisitionId)

  return {
    title,
    company: COMPANY_NAME,
    hiringEntity,
    department,
    location: buildLocation({ city, state }),
    city,
    state,
    country: 'India',
    jobId: requisitionId,
    requisitionId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    link: detailUrl,
    postingDate,
    jobDescription: null,
  }
}

export const extractSearchResults = (html) => {
  const rows = []

  for (const match of String(html ?? '').matchAll(/<tr[^>]*class="jobResultItem"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = parseRow(match[1])
    if (row) rows.push(row)
  }

  return rows
}

const extractDescriptionFromText = (text) => {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return null

  const explicitSection = normalized.match(/FUNCTION\s*:\s*[\s\S]+$/i)?.[0]
  if (explicitSection) {
    return normalizeWhitespace(
      explicitSection.replace(/\s*Apply Save Job Email Job to Friend Return to List\s*$/i, ''),
    )
  }

  return normalized
}

export const extractJobDetail = (html, listing = {}) => {
  const rawHtml = String(html ?? '')
  const bodyText = stripTags(rawHtml) || ''
  const detailSectionHtml = rawHtml.match(/<div[^>]*class="jobdescription"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
  const title = normalizeWhitespace(
    (stripTags(rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || listing.title || '') || '')
      .replace(/^Career Opportunities:\s*/i, '')
      .replace(/\s*\(\d+\)\s*$/i, ''),
  )
  const requisitionId = normalizeWhitespace(
    bodyText.match(/\bRequisition ID\s*([0-9]+)\b/i)?.[1] || listing.requisitionId || listing.jobId,
  )
  const postingDate = toIsoDate(
    bodyText.match(/\bPosted\s*([0-9/]{10})\b/i)?.[1] || listing.postingDate,
  )
  const jobDescription = detailSectionHtml
    ? stripTags(detailSectionHtml)
    : extractDescriptionFromText(bodyText)

  return {
    title: title || listing.title || null,
    requisitionId,
    postingDate,
    applyUrl: buildDetailUrl(requisitionId || listing.requisitionId || listing.jobId),
    jobDescription: jobDescription || listing.jobDescription || null,
  }
}

const waitForSelectorIfAvailable = async (page, selector) => {
  if (typeof page.waitForSelector !== 'function') return

  await page.waitForSelector(selector, { timeout: DEFAULT_TIMEOUT_MS })
}

const waitForPageChange = async (page, previousHtml) => {
  if (typeof page.waitForFunction === 'function') {
    try {
      await page.waitForFunction(
        (previous) => document.body && document.body.innerHTML !== previous,
        { timeout: 30000 },
        previousHtml,
      )
      return
    } catch {
      // Fall back to a small delay below.
    }
  }

  if (typeof page.waitForTimeout === 'function') {
    await page.waitForTimeout(1200)
  }
}

const collectSummaryPages = async (page, { maxPages = DEFAULT_MAX_PAGES } = {}) => {
  const listings = []
  const seenRequisitionIds = new Set()
  let html = await page.content()

  if (!hasSuccessFactorsSearchPageSignal(html)) {
    throw new Error('Avenue Supermarts verified SuccessFactors search surface no longer matches the known public page')
  }

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const pageJobs = extractSearchResults(html)

    for (const job of pageJobs) {
      if (seenRequisitionIds.has(job.requisitionId)) continue
      seenRequisitionIds.add(job.requisitionId)
      listings.push(job)
    }

    if (!hasNextPage(html)) break

    const previousHtml = html
    await page.evaluate(() => {
      document.querySelector('a[title="Next Page"]')?.click()
    })
    await waitForPageChange(page, previousHtml)
    html = await page.content()

    if (!html || html === previousHtml) break
  }

  return listings
}

export const createAvenueSupermartsScraper = ({
  launchBrowser: launchBrowserImpl = launchBrowser,
  createOptimizedPage: createOptimizedPageImpl = createOptimizedPage,
  now = () => new Date().toISOString(),
  maxPages = DEFAULT_MAX_PAGES,
} = {}) => ({
  async run() {
    const browser = await launchBrowserImpl()

    try {
      const page = await createOptimizedPageImpl(browser)

      await page.goto(CAREERS_PAGE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: DEFAULT_TIMEOUT_MS,
      })
      await waitForSelectorIfAvailable(
        page,
        'a[href*="career10.successfactors.com/career?company=avenuesupe"]',
      )

      const careersHtml = await page.content()
      if (!hasOfficialCareersPageSignal(careersHtml)) {
        throw new Error('Avenue Supermarts verified DMart careers page no longer matches the known public surface')
      }

      const handoffUrl = extractSuccessFactorsHandoffUrl(careersHtml)
      if (handoffUrl !== SUCCESSFACTORS_BOARD_URL) {
        throw new Error('Avenue Supermarts verified DMart careers page no longer exposes the known SuccessFactors handoff')
      }

      await page.goto(buildSearchUrl(), {
        waitUntil: 'domcontentloaded',
        timeout: DEFAULT_TIMEOUT_MS,
      })
      await waitForSelectorIfAvailable(page, 'tr.jobResultItem')

      const listings = await collectSummaryPages(page, { maxPages })
      const jobs = []

      for (const listing of listings) {
        await page.goto(listing.sourceUrl, {
          waitUntil: 'domcontentloaded',
          timeout: DEFAULT_TIMEOUT_MS,
        })
        await waitForSelectorIfAvailable(page, 'body')

        const detailHtml = await page.content()
        const detail = extractJobDetail(detailHtml, listing)

        jobs.push({
          ...listing,
          ...detail,
          source: SOURCE,
          company: COMPANY_NAME,
          country: 'India',
          companyCareerPage: CAREERS_PAGE_URL,
          companyDomain: PROVIDER_METADATA.companyDomain,
          atsPlatform: PROVIDER_METADATA.atsPlatform,
          link: detail.applyUrl || listing.applyUrl || listing.sourceUrl,
          scrapedAt: now(),
        })
      }

      return jobs
    } finally {
      await browser.close()
    }
  },
})

export const run = async (options = {}) => createAvenueSupermartsScraper(options).run()

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
