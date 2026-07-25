import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../utils/browser.js'
import { normalizeCity } from '../utils/cityNormalizer.js'
import { filterIndiaJobs } from '../utils/indiaLocationFilter.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'orioninnovation'
export const COMPANY = 'Orion Innovation'
export const CAREERS_PAGE_URL = 'https://www.orioninnovation.com/careers/life-at-orion/'
export const OPEN_JOBS_URL = 'https://www.orioninnovation.com/careers/job/'
export const JOB_LINK_SELECTOR = 'a[href*="gh_jid="]'
export const JOB_LINK_PATTERN = /^https:\/\/www\.orioninnovation\.com\/careers\/job\/\?gh_jid=\d+$/i

const NAVIGATION_TIMEOUT_MS = 45000
const PAGE_SETTLE_MS = 2500

const waitForPageSettle = async (page, timeoutMs = PAGE_SETTLE_MS) => {
  if (typeof page?.waitForTimeout === 'function') {
    await page.waitForTimeout(timeoutMs)
    return
  }

  await new Promise((resolve) => {
    setTimeout(resolve, timeoutMs)
  })
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[â€“â€”]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const uniqueBy = (items, getKey) => {
  const seen = new Set()
  const results = []

  for (const item of items) {
    const key = getKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    results.push(item)
  }

  return results
}

const extractJobIdFromUrl = (value) => {
  try {
    return new URL(value).searchParams.get('gh_jid')
  } catch {
    return null
  }
}

const deriveCountry = (location) => (/\bindia\b/i.test(location || '') ? 'India' : null)

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/^india(?:\b|,)/i.test(normalized)) return 'Remote'

  const firstSegment = normalized.split(',')[0]?.trim()
  return normalizeCity(firstSegment || normalized)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /Life at Orion - Orion Innovation/i.test(page)
    && /Where people grow and innovation thrives/i.test(page)
    && /Explore Opportunities/i.test(page)
    && /\/careers\/job\//i.test(page)
}

export const hasOfficialOpenJobsSignal = (pageData) => {
  const title = normalizeWhitespace(pageData?.title)
  const text = String(pageData?.text ?? '')
  const links = Array.isArray(pageData?.links) ? pageData.links : []

  return title === 'Job - Orion Innovation'
    && /Open Jobs/i.test(text)
    && /\bOpen Positions\b/i.test(text)
    && /Load more/i.test(text)
    && links.some((link) => JOB_LINK_PATTERN.test(normalizeWhitespace(link?.href) || ''))
}

export const extractJobsFromCards = (cards) => {
  const jobs = uniqueBy(
    (Array.isArray(cards) ? cards : [])
      .map((card) => {
        const title = normalizeWhitespace(card?.title)
        const location = normalizeWhitespace(card?.location)
        const department = normalizeWhitespace(card?.category)
        const employmentType = normalizeWhitespace(card?.workType)
        const sourceUrl = normalizeWhitespace(card?.href)
        const jobId = extractJobIdFromUrl(sourceUrl)

        if (!title || !location || !sourceUrl || !jobId || !JOB_LINK_PATTERN.test(sourceUrl)) {
          return null
        }

        return {
          title,
          company: COMPANY,
          department,
          location,
          city: deriveCity(location),
          country: deriveCountry(location),
          jobId,
          requisitionId: jobId,
          sourceUrl,
          applyUrl: sourceUrl,
          employmentType,
          experienceRequired: null,
          minimumQualification: null,
          preferredQualification: null,
          requiredSkills: [],
          postingDate: null,
          closingDate: null,
          jobDescription: null,
        }
      })
      .filter(Boolean),
    (job) => job.sourceUrl,
  )

  return filterIndiaJobs(jobs).map((job) => ({
    ...job,
    country: 'India',
  }))
}

const collectPageData = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
  await page.waitForSelector('body', { timeout: NAVIGATION_TIMEOUT_MS }).catch(() => null)
  await waitForPageSettle(page)

  return page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    text: document.body?.innerText || '',
    links: Array.from(document.querySelectorAll('a[href]')).map((anchor) => ({
      text: anchor.textContent || '',
      href: anchor.href,
    })),
  }))
}

const readRenderedJobCards = async (page) => page.$$eval(JOB_LINK_SELECTOR, (anchors) => anchors
  .map((anchor) => {
    const rawText = (anchor.innerText || anchor.textContent || '')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')

    const textLines = rawText.split('\n').map((line) => line.trim()).filter(Boolean)
    const title = textLines[0] || null
    const location = rawText.match(/Location:\s*(.+?)(?=\s+Category:|\s+Work Type:|$)/i)?.[1]?.trim() || null
    const category = rawText.match(/Category:\s*(.+?)(?=\s+Work Type:|$)/i)?.[1]?.trim() || null
    const workType = rawText.match(/Work Type:\s*(.+?)$/i)?.[1]?.trim() || null

    return {
      title,
      location,
      category,
      workType,
      href: anchor.href || null,
    }
  })
  .filter((card) => card.href),
)

const createBrowserContext = async ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const careersPage = await createOptimizedPageImpl(browser)
    const jobsPage = await createOptimizedPageImpl(browser)

    return {
      browser,
      careersPage,
      jobsPage,
      close: async () => browser.close(),
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

export const createOrionInnovationScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    collectPageDataImpl = collectPageData,
    readRenderedJobCardsImpl = readRenderedJobCards,
    launchBrowserImpl = launchBrowser,
    createOptimizedPageImpl = createOptimizedPage,
  } = {}) {
    const browserContext = await createBrowserContext({
      launchBrowserImpl,
      createOptimizedPageImpl,
    })

    try {
      const careersPageData = await collectPageDataImpl(browserContext.careersPage, CAREERS_PAGE_URL)
      if (!hasOfficialCareersSignal([
        careersPageData?.title,
        careersPageData?.text,
        ...(careersPageData?.links || []).map((link) => link?.href),
      ].join(' '))) {
        throw new Error('Orion Innovation careers page no longer matches the verified official public surface')
      }

      const openJobsPageData = await collectPageDataImpl(browserContext.jobsPage, OPEN_JOBS_URL)
      if (!hasOfficialOpenJobsSignal(openJobsPageData)) {
        throw new Error('Orion Innovation open jobs page no longer matches the verified official public surface')
      }

      await browserContext.jobsPage?.waitForSelector?.(JOB_LINK_SELECTOR, {
        timeout: NAVIGATION_TIMEOUT_MS,
      })?.catch(() => null)

      const jobs = extractJobsFromCards(await readRenderedJobCardsImpl(browserContext.jobsPage))
      const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

      return selectedJobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      }))
    } finally {
      await browserContext.close()
    }
  },
})

export const run = async (options = {}) => createOrionInnovationScraper().run(options)

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
