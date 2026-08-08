import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

export const SOURCE = 'mindbowser'
export const COMPANY = 'Mindbowser'
export const CAREERS_URL = 'https://www.mindbowser.com/careers/'
export const HRONE_SHORT_URL = 'https://hr-1.in/829c17'
export const HRONE_CARD_SELECTOR = '.content-box'

const APPLY_BUTTON_SELECTOR = `${HRONE_CARD_SELECTOR} .cls-apply-btn`
const TRUSTED_HRONE_HOST = 'career.hrone.cloud'
const TRUSTED_HRONE_PORTAL_PATH = '/career-portal'
const TRUSTED_HRONE_APPLY_PATH = '/apply-job'
const TRUSTED_HRONE_DC = 'mindbowser'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const resolveUrl = (value, baseUrl = CAREERS_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const isMindbowserHROneHandoffUrl = (value) => {
  try {
    const url = new URL(value)
    return url.hostname === 'hr-1.in'
      || (
        url.hostname === TRUSTED_HRONE_HOST
        && url.pathname === TRUSTED_HRONE_PORTAL_PATH
        && url.searchParams.get('dc') === TRUSTED_HRONE_DC
      )
  } catch {
    return false
  }
}

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

const extractExperienceFromTitle = (title) => {
  const match = normalizeWhitespace(title).match(/\((\d+\s*-\s*\d+\s*Years?)\)/i)
  return match ? normalizeWhitespace(match[1]) : null
}

export const extractVacanciesBoardUrl = (html) => {
  const anchors = [...String(html ?? '').matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map(([, href, label]) => ({
      href: resolveUrl(href),
      label: normalizeWhitespace(String(label ?? '').replace(/<[^>]+>/g, ' ')),
    }))
    .filter((anchor) => anchor.href)

  const preferredAnchor = anchors.find((anchor) =>
    /current openings|apply now/i.test(anchor.label) && isMindbowserHROneHandoffUrl(anchor.href),
  ) || anchors.find((anchor) => isMindbowserHROneHandoffUrl(anchor.href))

  return preferredAnchor?.href ?? null
}

export const hasOfficialCareersSignal = (html) => {
  const source = String(html ?? '')

  return /Mindbowser/i.test(source)
    && /Current Openings/i.test(source)
    && /ta@mindbowser\.com/i.test(source)
    && /Apply Now/i.test(source)
}

export const isTrustedBoardPageUrl = (value) => {
  try {
    const url = new URL(value)
    return url.hostname === TRUSTED_HRONE_HOST
      && url.pathname === TRUSTED_HRONE_PORTAL_PATH
      && url.searchParams.get('dc') === TRUSTED_HRONE_DC
      && Boolean(url.searchParams.get('appId'))
      && Boolean(url.searchParams.get('rqt'))
      && Boolean(url.searchParams.get('cc'))
  } catch {
    return false
  }
}

export const toTrustedApplyUrl = (value) => {
  try {
    const url = new URL(value)
    if (url.hostname !== TRUSTED_HRONE_HOST) return null
    if (url.pathname !== TRUSTED_HRONE_APPLY_PATH) return null
    if (url.searchParams.get('dc') !== TRUSTED_HRONE_DC) return null
    if (!url.searchParams.get('appId')) return null
    if (!url.searchParams.get('rqt')) return null
    if (!url.searchParams.get('cc')) return null
    if (!url.searchParams.get('pid')) return null
    return url.toString()
  } catch {
    return null
  }
}

const readRenderedJobCards = (page) => page.$$eval(HRONE_CARD_SELECTOR, (cards) => {
  const normalize = (value) => String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cards
    .filter((card) => card.querySelector('.cls-apply-btn'))
    .map((card) => {
      const titleNode = card.querySelector('.cls-jobtitle')
      const titleClone = titleNode?.cloneNode(true)
      titleClone?.querySelector('.chip-new')?.remove()

      return {
        title: normalize(titleClone?.textContent),
        requisitionId: normalize(card.querySelector('.chip-new')?.textContent),
      }
    })
    .filter((card) => card.title && card.requisitionId)
})

const settlePopupTargetResult = (promise) => promise.then(
  (target) => ({ target, error: null }),
  (error) => ({ target: null, error }),
)

const isPopupTargetTimeoutError = (error) => (
  /TimeoutError/i.test(String(error?.name || ''))
  && /Timed out after waiting \d+ms/i.test(String(error?.message || ''))
)

const captureApplyUrls = async (page) => {
  const browser = page.browser?.()
  if (!browser?.waitForTarget) return []

  const buttons = await page.$$(APPLY_BUTTON_SELECTOR)
  const knownTargets = new Set(typeof browser.targets === 'function' ? browser.targets() : [])
  const applyUrls = []

  for (const button of buttons) {
    try {
      const targetResultPromise = settlePopupTargetResult(browser.waitForTarget(
        (target) => (
          !knownTargets.has(target)
          && target.opener?.() === page.target?.()
          && /\/apply-job\?/i.test(target.url?.() || '')
        ),
        { timeout: 5000 },
      ))

      if (typeof page.bringToFront === 'function') {
        await page.bringToFront()
      }

      await button.click()
      const { target, error } = await targetResultPromise
      if (error) {
        if (isPopupTargetTimeoutError(error)) {
          applyUrls.push(null)
          continue
        }

        throw error
      }

      knownTargets.add(target)

      const trustedUrl = toTrustedApplyUrl(target?.url?.())
      if (trustedUrl) {
        applyUrls.push(trustedUrl)
      } else {
        applyUrls.push(null)
      }
    } catch {
      applyUrls.push(null)
    }
  }

  return applyUrls
}

const getBoardNavigationTimeoutMs = () => Math.max(config.jobListingTimeoutMs || 30000, 90000)

export const readRenderedHrOneCards = async (page) => {
  await page.waitForFunction(
    (selector) => document.querySelectorAll(selector).length > 0,
    {
      timeout: config.jobListingTimeoutMs || 30000,
    },
    APPLY_BUTTON_SELECTOR,
  )

  const cards = await readRenderedJobCards(page)

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error('Mindbowser public HROne vacancies surface no longer renders job cards')
  }

  const applyUrls = await captureApplyUrls(page)

  return cards.map((card, index) => ({
    ...card,
    applyUrl: applyUrls[index] || null,
  }))
}

export const extractMindbowserJobs = (cards, { boardUrl } = {}) => {
  if (!isTrustedBoardPageUrl(boardUrl)) {
    throw new Error('Mindbowser trusted HROne board url is required for job extraction')
  }

  return (Array.isArray(cards) ? cards : []).map((card) => {
    const title = normalizeWhitespace(card?.title)
    const requisitionId = normalizeWhitespace(card?.requisitionId)

    if (!title || !requisitionId) {
      throw new Error('Mindbowser rendered HROne card is missing required trusted metadata')
    }

    const applyUrl = toTrustedApplyUrl(card?.applyUrl) || boardUrl

    return {
      title,
      company: COMPANY,
      department: null,
      location: null,
      city: null,
      country: 'India',
      jobId: requisitionId,
      requisitionId,
      sourceUrl: applyUrl,
      applyUrl,
      employmentType: null,
      experienceRequired: extractExperienceFromTitle(title),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    }
  })
}

export const createMindbowserScraper = ({
  maxJobs = null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const browserFactory = options.launchBrowser || launchBrowser
    const pageFactory = options.createPage || createOptimizedPage
    const readRenderedCards = options.readRenderedCards || readRenderedHrOneCards
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Mindbowser verified official careers surface no longer matches expectations')
    }

    const vacanciesUrl = extractVacanciesBoardUrl(careersHtml)
    if (vacanciesUrl !== HRONE_SHORT_URL) {
      throw new Error('Mindbowser careers page no longer links to the verified public HROne vacancies surface')
    }

    let browser
    try {
      browser = await browserFactory()
      const page = await pageFactory(browser)
      await page.goto(vacanciesUrl, {
        waitUntil: 'domcontentloaded',
        timeout: getBoardNavigationTimeoutMs(),
      })
      await page.waitForSelector(HRONE_CARD_SELECTOR, {
        timeout: config.jobListingTimeoutMs || 30000,
      })

      const boardUrl = page.url()
      if (!isTrustedBoardPageUrl(boardUrl)) {
        throw new Error('Mindbowser public vacancies handoff no longer resolves to the trusted HROne board')
      }

      const jobs = extractMindbowserJobs(await readRenderedCards(page), { boardUrl })
      const selectedJobs = Number.isInteger(maxJobs) && maxJobs > 0
        ? jobs.slice(0, maxJobs)
        : jobs

      return selectedJobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl,
        scrapedAt: new Date().toISOString(),
      }))
    } finally {
      if (browser) await browser.close()
    }
  },
})

export const run = async (options = {}) => createMindbowserScraper().run(options)

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
