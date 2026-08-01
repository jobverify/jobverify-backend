import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'mavericsystems'
export const COMPANY_NAME = 'Maveric Systems'
export const HOMEPAGE_URL = 'https://maveric-systems.com/'
export const CAREER_PAGE_URL = 'https://maveric-systems.com/careers/'
export const SUMMARY_URL = 'https://career44.sapsf.com/career?company=mavericsys&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&'
export const DETAIL_BASE_URL = 'https://career44.sapsf.com/career?career_ns=job_listing&company=mavericsys&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&selected_lang=en_US&browserTimeZone=Asia/Calcutta'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

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

const buildAbsoluteUrl = (value) => new URL(value, SUMMARY_URL).toString()

export const buildDetailUrl = (requisitionId) =>
  `${DETAIL_BASE_URL}&career_job_req_id=${encodeURIComponent(String(requisitionId))}`

export const buildSearchUrl = () => SUMMARY_URL

const parseRow = (rowHtml) => {
  const titleMatch = rowHtml.match(/<a class="jobTitle"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
  const title = normalizeWhitespace(titleMatch?.[2])
  const href = titleMatch?.[1] ? buildAbsoluteUrl(titleMatch[1]) : null
  const text = stripTags(rowHtml) || ''
  const requisitionId = normalizeWhitespace(rowHtml.match(/Requisition ID:\s*<span[^>]*>([^<]+)<\/span>/i)?.[1])
  const rowMatch = text.match(/Posted on\s+([0-9/.-]+)\s*-\s*([^-\n]+?)\s*-\s*([^-]+?)(?:\s+No Travel|$)/i)
  const postingDate = normalizeWhitespace(rowMatch?.[1])
  const location = normalizeWhitespace(rowMatch?.[2]) || null
  const department = normalizeWhitespace(rowMatch?.[3]?.replace(/\s+No Travel$/i, '') || null)
  const travel = /No Travel/i.test(text) ? 'No Travel' : null

  if (!title || !requisitionId || !href) return null

  const detailUrl = buildDetailUrl(requisitionId)

  return {
    title,
    company: COMPANY_NAME,
    department,
    location: location ? `${location}, India` : 'India',
    city: location ? location.replace(/,?\s*India$/i, '') : null,
    country: 'India',
    jobId: requisitionId,
    requisitionId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    link: detailUrl,
    postingDate: postingDate || null,
    remoteStatus: travel ? 'On-site' : null,
    jobDescription: null,
  }
}

export const extractSearchResults = (html) => {
  const results = []

  for (const match of String(html ?? '').matchAll(/<tr class="jobResultItem">([\s\S]*?)<\/tr>/gi)) {
    const row = parseRow(match[1])
    if (row) results.push(row)
  }

  return results
}

const extractMeta = (html) => normalizeWhitespace(
  html.match(/<div class="job-meta">([\s\S]*?)<\/div>/i)?.[1]
  || '',
)

const extractDetailDescription = (html) => {
  const descriptionHtml = html.match(/<div class="job-description">([\s\S]*?)<\/div>/i)?.[1]
  return normalizeWhitespace(stripTags(descriptionHtml || html))
}

const extractApplyUrl = (html) => {
  const href = decodeHtmlEntities(html.match(/<a[^>]*href="([^"]+)"[^>]*>\s*Apply\s*<\/a>/i)?.[1])
  return href ? new URL(href, DETAIL_BASE_URL).toString() : null
}

export const extractJobDetail = (html, listing = {}) => {
  const rawTitle = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || listing.title || '') || ''
  const title = normalizeWhitespace(
    rawTitle
      .replace(/^Career Opportunities:\s*/i, '')
      .replace(/\s*\(\d+\)\s*$/i, ''),
  )
  const meta = extractMeta(html)
  const applyUrl = extractApplyUrl(html) || buildDetailUrl(listing.requisitionId || listing.jobId)
  const jobDescription = extractDetailDescription(html)

  return {
    title,
    requisitionId: listing.requisitionId || listing.jobId || null,
    applyUrl,
    jobDescription,
    meta,
  }
}

const verifyFirstPartySurface = async (fetchText) => {
  const homepageHtml = await fetchText(HOMEPAGE_URL)
  const careersHtml = await fetchText(CAREER_PAGE_URL)

  if (!/maveric systems/i.test(homepageHtml)) {
    throw new Error('Maveric Systems homepage verification failed')
  }

  if (!/career44\.sapsf\.com|successfactors/i.test(careersHtml)) {
    throw new Error('Maveric Systems careers verification failed')
  }
}

const fetchTextWithHeaders = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const collectSummaryPages = async (page) => {
  const listings = []
  let html = await page.content()
  let previousHtml = null

  while (html && html !== previousHtml) {
    listings.push(...extractSearchResults(html))

    if (!/title="Next Page"/i.test(html)) {
      break
    }

    previousHtml = html
    await page.evaluate(() => {
      document.querySelector('a[title="Next Page"]')?.click()
    })
    html = await page.content()
  }

  return listings
}

export const createMavericSystemsScraper = ({
  fetchText = fetchTextWithHeaders,
  launchBrowser: launchBrowserImpl = launchBrowser,
  createOptimizedPage: createOptimizedPageImpl = createOptimizedPage,
} = {}) => ({
  async run() {
    await verifyFirstPartySurface(fetchText)

    const browser = await launchBrowserImpl()

    try {
      const page = await createOptimizedPageImpl(browser)
      await page.goto(buildSearchUrl(), { waitUntil: 'domcontentloaded' })

      const listings = await collectSummaryPages(page)
      const jobs = []

      for (const listing of listings) {
        await page.goto(listing.sourceUrl, { waitUntil: 'domcontentloaded' })
        const detailHtml = await page.content()
        const detail = extractJobDetail(detailHtml, listing)

        jobs.push({
          ...listing,
          ...detail,
          source: SOURCE,
          company: COMPANY_NAME,
          country: 'India',
          companyCareerPage: CAREER_PAGE_URL,
          companyDomain: 'maveric-systems.com',
          atsPlatform: 'successfactors',
          link: detail.applyUrl || listing.applyUrl || listing.sourceUrl,
          scrapedAt: new Date().toISOString(),
        })
      }

      return jobs
    } finally {
      await browser.close()
    }
  },
})

export const run = async (options = {}) => createMavericSystemsScraper(options).run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Maveric Systems scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
