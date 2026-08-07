import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const SURFACE_TIMEOUT_MS = 120000
let browserUtilsPromise = null

const loadBrowserUtils = async () => {
  browserUtilsPromise ||= import('../../scraper-support/utils/browser.js')
  return browserUtilsPromise
}

export const CAREERS_URL = 'https://www.mobikwik.com/careers'
export const SOURCE = 'mobikwik'
export const COMPANY_NAME = 'MobiKwik'
export const COMPANY = COMPANY_NAME
export const COMPANY_ID = 'main'
export const VERIFIED_ON = '2026-08-01'
export const DARWINBOX_ORIGIN = 'https://mobikwik.darwinbox.in'
export const OFFICIAL_CAREERS_HANDOFF_URL = `${DARWINBOX_ORIGIN}/ms/candidatev2/${COMPANY_ID}/careers/home`
export const PUBLIC_ALL_JOBS_URL = `${DARWINBOX_ORIGIN}/ms/candidatev2/${COMPANY_ID}/careers/allJobs`

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/+$/g, '')
  } catch {
    return String(value ?? '').replace(/\/+$/g, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

const extractSurfaceText = (surface = {}) => normalizeWhitespace(surface?.text) || ''
const extractSurfaceTitle = (surface = {}) => normalizeWhitespace(surface?.title) || ''

export const extractDarwinboxHandoffUrl = (surface = {}) => {
  const anchors = Array.isArray(surface?.anchors) ? surface.anchors : []

  for (const anchor of anchors) {
    const href = normalizeWhitespace(anchor?.href)
    const text = normalizeWhitespace(anchor?.text) || ''

    if (!href || !/darwinbox\.in/i.test(href)) continue
    if (!/view job openings|open jobs|jobs|careers/i.test(text)) continue

    return normalizeComparableUrl(href)
  }

  return null
}

export const hasOfficialCareersSignal = (surface = {}) => {
  const title = extractSurfaceTitle(surface)
  const text = extractSurfaceText(surface)

  return /^MobiKwik Careers: Join Our Team$/i.test(title)
    && text.includes('Want to empower millions of Indians with financial Independence?')
    && text.includes('We are a publicly listed fintech company')
    && text.includes("There's a lot to love at MobiKwik")
    && text.includes('View Job Openings')
}

export const hasDarwinboxHandoffSignal = (surface = {}) =>
  hasOfficialCareersSignal(surface)
  && sameUrl(extractDarwinboxHandoffUrl(surface), OFFICIAL_CAREERS_HANDOFF_URL)

export const hasExternalJobsHandoffSignal = (surface = {}) =>
  hasDarwinboxHandoffSignal(surface)

const defaultLoadRenderedCareersSurface = async (targetUrl = CAREERS_URL) => {
  const { launchBrowser, createOptimizedPage } = await loadBrowserUtils()
  const browser = await launchBrowser()

  try {
    const page = await createOptimizedPage(browser)
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: SURFACE_TIMEOUT_MS })
    const title = await page.title()
    const text = await page.evaluate(() => document.body?.innerText || '')
    const anchors = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a')).map((anchor) => ({
        href: anchor.href,
        text: (anchor.textContent || '').trim(),
      })),
    )

    return { title, text, anchors }
  } finally {
    await browser.close()
  }
}

const createConfiguredDarwinboxScraper = () => createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

export const createMobiKwikScraper = ({
  now = () => new Date().toISOString(),
  loadRenderedCareersSurface = defaultLoadRenderedCareersSurface,
  darwinboxScraper = createConfiguredDarwinboxScraper(),
} = {}) => ({
  ...darwinboxScraper,
  async run({
    loadRenderedCareersSurface: overrideLoadRenderedCareersSurface = loadRenderedCareersSurface,
    ...darwinboxOptions
  } = {}) {
    const careersSurface = await overrideLoadRenderedCareersSurface(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersSurface)) {
      throw new Error('MobiKwik official careers surface changed; refusing to assume the verified Darwinbox jobs surface still applies')
    }

    if (!sameUrl(extractDarwinboxHandoffUrl(careersSurface), OFFICIAL_CAREERS_HANDOFF_URL)) {
      throw new Error('MobiKwik careers handoff changed; refusing to assume the verified Darwinbox jobs routes still apply')
    }

    const jobs = await darwinboxScraper.run(darwinboxOptions)
    const scrapedAt = now()

    return jobs.map((job) => ({
      ...job,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createMobiKwikScraper().run(options)

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
