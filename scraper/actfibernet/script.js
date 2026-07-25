import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createOptimizedPage,
  launchBrowser,
  resolveBrowserExecutablePath,
} from '../utils/browser.js'
import { loadConfig } from '../utils/loadConfig.js'

import provider from './provider.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = provider.source
export const COMPANY = provider.companyName
export const OFFICIAL_BRAND_NAME = provider.officialBrandName
export const VERIFIED_ON = provider.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = provider.verifiedSurfaceSummary
export const PROVIDER_METADATA = provider
export const CAREERS_PAGE_URL = provider.companyCareerPage
export const FOUNTAIN_BOARD_URL = provider.fountainBoardUrl
export const JOB_CARD_TITLE_SELECTOR = 'button h3'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify/1.0)'
const FOUNTAIN_HOST = new URL(FOUNTAIN_BOARD_URL).hostname
const FOUNTAIN_BOARD_PATH = new URL(FOUNTAIN_BOARD_URL).pathname.replace(/\/$/, '')
const FOREIGN_LOCATION_PATTERN =
  /\b(united arab emirates|uae|united states|usa|singapore|germany|france|australia|canada|united kingdom|uk|dubai)\b/i

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeText = (value) => normalizeWhitespace(value)?.toLowerCase() || ''

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/&/g, ' ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || null

const defaultFetchText = async (url) => {
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

export const hasActFibernetCareersSignal = (html) => {
  const source = String(html ?? '')
  const boardUrlPattern = new RegExp(
    FOUNTAIN_BOARD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/'),
    'i',
  )

  const text = normalizeText(source)

  return /<title>\s*.*Act Fibernet\s*\|\s*Act Fibernet\s*<\/title>/i.test(source)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.actcorp\.in\/careers["']/i.test(source)
    && text.includes('job opportunities')
    && text.includes('benefits at act fibernet')
    && text.includes('explore job openings')
    && boardUrlPattern.test(source)
}

const isSafeFountainJobUrl = (value) => {
  try {
    const url = new URL(value, FOUNTAIN_BOARD_URL)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.hostname !== FOUNTAIN_HOST) return null
    if (!url.pathname.startsWith(`${FOUNTAIN_BOARD_PATH}/`)) return null
    return url.href.split('#')[0]
  } catch {
    return null
  }
}

const getCity = (location) => normalizeWhitespace(location)?.split(',')[0] || null

const isIndiaLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return false
  if (/india/i.test(normalized)) return true
  if (FOREIGN_LOCATION_PATTERN.test(normalized)) return false
  return true
}

const normalizeIndiaLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/india/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const stripLocationPrefixFromTitle = ({ title, location }) => {
  const normalizedTitle = normalizeWhitespace(title)
  const normalizedLocation = normalizeWhitespace(location)
  if (!normalizedTitle) return null
  if (!normalizedLocation) return normalizedTitle

  const city = getCity(normalizedLocation)
  const prefixes = [
    `${normalizedLocation} - `,
    city ? `${city} - ` : null,
  ].filter(Boolean)

  const matchedPrefix = prefixes.find((prefix) =>
    normalizedTitle.toLowerCase().startsWith(prefix.toLowerCase()),
  )

  return matchedPrefix
    ? normalizeWhitespace(normalizedTitle.slice(matchedPrefix.length))
    : normalizedTitle
}

const buildFallbackJobUrl = (jobId) => `${FOUNTAIN_BOARD_URL}#${jobId}`

export const extractFountainJobs = (cards) => {
  const seenJobIds = new Set()

  return (Array.isArray(cards) ? cards : [])
    .map((card) => {
      const rawLocation = normalizeWhitespace(card?.location)
      if (!isIndiaLocation(rawLocation)) return null

      const location = normalizeIndiaLocation(rawLocation)
      const title = stripLocationPrefixFromTitle({
        title: card?.title,
        location: rawLocation,
      })
      const city = getCity(location)
      const jobId = slugify(`${city || rawLocation}-${title}`)
      const sourceUrl = isSafeFountainJobUrl(card?.href) || (jobId ? buildFallbackJobUrl(jobId) : null)

      if (!title || !location || !jobId || !sourceUrl || seenJobIds.has(jobId)) {
        return null
      }

      seenJobIds.add(jobId)
      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(card?.department),
        location,
        city,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
      }
    })
    .filter(Boolean)
}

const readRenderedFountainCards = async (page) => page.$$eval(JOB_CARD_TITLE_SELECTOR, (elements) => elements
  .map((titleElement) => {
    const card = titleElement.closest('button')
    const paragraphs = [...(card?.querySelectorAll('p') || [])]
      .map((node) => node.textContent?.trim())
      .filter(Boolean)

    return {
      title: titleElement.textContent?.trim() || null,
      location: paragraphs[0] || null,
      department: null,
      href: card?.querySelector('a[href]')?.href || null,
    }
  })
  .filter((card) => card.title),
)

const expandAllRenderedCards = async (page, { maxClicks = 25, delayMs = 500 } = {}) => {
  if (typeof page.evaluate !== 'function') return

  for (let index = 0; index < maxClicks; index += 1) {
    const clicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')]
      const seeMoreButton = buttons.find((button) => /see more/i.test(button.textContent || ''))

      if (!seeMoreButton) return false

      seeMoreButton.click()
      return true
    })

    if (!clicked) return
    await sleep(delayMs)
  }
}

const runDumpDom = (url, execFileImpl = execFile) => new Promise((resolve, reject) => {
  const executablePath = resolveBrowserExecutablePath()

  if (!executablePath) {
    reject(new Error('No local Chrome or Edge executable is available for ACT Fibernet DOM rendering'))
    return
  }

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--virtual-time-budget=20000',
    '--dump-dom',
    url,
  ]

  execFileImpl(executablePath, args, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      reject(new Error(stderr || error.message))
      return
    }

    resolve(String(stdout ?? ''))
  })
})

const extractCardsFromDumpedDom = (html) => [...String(html ?? '').matchAll(
  /<button\b[^>]*>\s*<div[\s\S]{0,1200}?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]{0,1200}?<p>([\s\S]*?)<\/p>/gi,
)]
  .map((match) => ({
    title: normalizeWhitespace(match[1]),
    location: normalizeWhitespace(match[2]),
    department: null,
    href: null,
  }))
  .filter((card) => card.title && card.location)

const loadCardsWithBrowser = async ({
  browserFactory,
  pageFactory,
} = {}) => {
  let browser

  try {
    browser = await browserFactory()
    const page = await pageFactory(browser)
    await page.goto(FOUNTAIN_BOARD_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector(JOB_CARD_TITLE_SELECTOR, {
      timeout: config.jobListingTimeoutMs || 30000,
    })
    await expandAllRenderedCards(page)
    return readRenderedFountainCards(page)
  } finally {
    if (browser) await browser.close()
  }
}

const loadCardsFromDumpedDom = async ({ execFileImpl = execFile } = {}) => {
  const html = await runDumpDom(FOUNTAIN_BOARD_URL, execFileImpl)
  return extractCardsFromDumpedDom(html)
}

const loadActFibernetBoardCards = async (options = {}) => {
  if (options.launchBrowser || options.createPage) {
    return loadCardsWithBrowser({
      browserFactory: options.launchBrowser,
      pageFactory: options.createPage,
    })
  }

  try {
    return await loadCardsWithBrowser({
      browserFactory: launchBrowser,
      pageFactory: createOptimizedPage,
    })
  } catch {
    return loadCardsFromDumpedDom({ execFileImpl: options.execFileImpl || execFile })
  }
}

export const createActFibernetScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasActFibernetCareersSignal(careersHtml)) {
      throw new Error('Act Fibernet careers page does not match the expected official ACT Fibernet careers page structure')
    }

    const jobs = extractFountainJobs(await loadActFibernetBoardCards(options))
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createActFibernetScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ACT Fibernet scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
