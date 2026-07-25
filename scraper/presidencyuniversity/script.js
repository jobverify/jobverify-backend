import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../utils/browser.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_URL = 'https://presidencyuniversity.in/careers'
export const HRONE_VACANCIES_URL = 'https://hr-1.in/b42a6e'
export const SOURCE = 'presidencyuniversity'
export const COMPANY_NAME = 'Presidency University'
export const HRONE_CARD_SELECTOR = '.content-box'

const TRUSTED_HRONE_HOST = 'career.hrone.cloud'
const TRUSTED_HRONE_PORTAL_PATH = '/career-portal'
const TRUSTED_HRONE_APPLY_PATH = '/apply-job'
const APPLY_BUTTON_SELECTOR = `${HRONE_CARD_SELECTOR} .cls-apply-btn`
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || normalized === '-') return null
  if (/,\s*india$/i.test(normalized)) return normalized
  if (/^bengaluru$/i.test(normalized)) return 'Bengaluru, India'
  return normalized
}

const normalizeBoardValue = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized === '-' ? null : normalized
}

const getCity = (location) => normalizeWhitespace(location)?.split(',')[0] || null

const buildJobDescription = ({
  jobFunction,
  experienceRequired,
  openings,
  workMode,
  location,
}) => {
  const parts = [
    jobFunction ? `Job function: ${jobFunction}.` : null,
    experienceRequired ? `Experience(years): ${experienceRequired}.` : null,
    openings ? `Number of openings: ${openings}.` : null,
    workMode ? `Preferred work mode: ${workMode}.` : null,
    location ? `Job location: ${location}.` : null,
  ].filter(Boolean)

  return parts.join(' ') || null
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

export const extractVacanciesBoardUrl = (html) => {
  const source = String(html ?? '')
  const match = source.match(/<a[^>]+href="([^"]+)"[^>]*>\s*See All Vacancies\s*<\/a>/i)

  if (!match) return null

  try {
    return new URL(match[1], CAREERS_URL).toString()
  } catch {
    return null
  }
}

export const hasOfficialCareersSignal = (html) => {
  const source = String(html ?? '')

  return /Presidency University/i.test(source)
    && /At Presidency University we are committed to building a workplace/i.test(source)
    && /Current\s+Vacanc/i.test(source)
    && /vacancy-box/i.test(source)
    && /See All Vacancies/i.test(source)
    && /https:\/\/career\.hrone\.cloud\/apply-job\?/i.test(source)
}

export const isTrustedBoardPageUrl = (value) => {
  try {
    const url = new URL(value)
    return url.hostname === TRUSTED_HRONE_HOST
      && url.pathname === TRUSTED_HRONE_PORTAL_PATH
      && url.searchParams.get('dc') === 'presidency'
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
    if (url.searchParams.get('dc') !== 'presidency') return null
    if (!url.searchParams.get('appId')) return null
    if (!url.searchParams.get('rqt')) return null
    if (!url.searchParams.get('cc')) return null
    if (!url.searchParams.get('pid')) return null
    return url.toString()
  } catch {
    return null
  }
}

export const extractHrOneJobs = (cards) => {
  const seenRequisitionIds = new Set()

  return (Array.isArray(cards) ? cards : []).map((card, index) => {
    const title = normalizeWhitespace(card?.title)
    const requisitionId = normalizeWhitespace(card?.requisitionId)
    const applyUrl = toTrustedApplyUrl(card?.applyUrl)

    if (!title || !requisitionId || !applyUrl) {
      throw new Error(
        `Presidency University HROne card ${index + 1} is missing trusted public apply metadata`,
      )
    }

    if (seenRequisitionIds.has(requisitionId)) {
      return null
    }
    seenRequisitionIds.add(requisitionId)

    const department = normalizeBoardValue(card?.jobFunction)
    const experienceRequired = normalizeBoardValue(card?.experience)
    const openings = normalizeBoardValue(card?.openings)
    const workMode = normalizeBoardValue(card?.workMode)
    const location = normalizeLocation(card?.location)

    return {
      title,
      company: COMPANY_NAME,
      department,
      location,
      city: getCity(location),
      country: 'India',
      jobId: requisitionId,
      requisitionId,
      sourceUrl: applyUrl,
      applyUrl,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: buildJobDescription({
        jobFunction: department,
        experienceRequired,
        openings,
        workMode,
        location,
      }),
    }
  }).filter(Boolean)
}

const hasShowMoreButton = (page) => page.evaluate(
  () => Array.from(document.querySelectorAll('button'))
    .some((button) => /show more/i.test(button.textContent || '')),
)

const countApplyButtons = (page) => page.$$eval(APPLY_BUTTON_SELECTOR, (buttons) => buttons.length)

const expandAllHrOneListings = async (page) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (!(await hasShowMoreButton(page))) return

    const previousCount = await countApplyButtons(page)
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((button) => /show more/i.test(button.textContent || ''))
        ?.click()
    })

    await page.waitForFunction(
      (selector, countBeforeClick) => (
        document.querySelectorAll(selector).length > countBeforeClick
        || !Array.from(document.querySelectorAll('button'))
          .some((button) => /show more/i.test(button.textContent || ''))
      ),
      {
        timeout: 15000,
      },
      APPLY_BUTTON_SELECTOR,
      previousCount,
    )
  }
}

const readRenderedJobCards = (page) => page.$$eval(HRONE_CARD_SELECTOR, (cards) => {
  const normalize = (value) => {
    const normalized = String(value ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return normalized || null
  }

  return cards
    .filter((card) => card.querySelector('.cls-apply-btn'))
    .map((card) => {
      const titleNode = card.querySelector('.cls-jobtitle')
      const titleClone = titleNode?.cloneNode(true)
      titleClone?.querySelector('.chip-new')?.remove()

      const fields = {}
      Array.from(card.querySelectorAll('.mobile-width > div')).forEach((section) => {
        const label = normalize(section.querySelector('.cls-lbl')?.textContent)
        const value = normalize(section.querySelector('.cls-vlu')?.textContent)

        if (label) fields[label] = value
      })

      return {
        title: normalize(titleClone?.textContent),
        requisitionId: normalize(card.querySelector('.chip-new')?.textContent),
        jobFunction: fields['Job function'] || null,
        experience: fields['Experience(years)'] || null,
        openings: fields['Number of openings'] || null,
        workMode: fields['Preferred work mode'] || null,
        location: fields['Job location'] || null,
      }
    })
})

const captureApplyUrls = async (page) => {
  const browser = page.browser()
  const buttons = await page.$$(APPLY_BUTTON_SELECTOR)
  const knownTargets = new Set(browser.targets())
  const applyUrls = []

  for (const button of buttons) {
    const targetPromise = browser.waitForTarget(
      (target) => (
        !knownTargets.has(target)
        && target.opener() === page.target()
        && /\/apply-job\?/i.test(target.url())
      ),
      {
        timeout: 10000,
      },
    )

    await page.bringToFront()
    await button.click()
    const target = await targetPromise
    knownTargets.add(target)
    applyUrls.push(target.url())
  }

  return applyUrls
}

export const readRenderedHrOneCards = async (page) => {
  await page.waitForFunction(
    (selector) => document.querySelectorAll(selector).length >= 10,
    {
      timeout: config.jobListingTimeoutMs || 30000,
    },
    APPLY_BUTTON_SELECTOR,
  )

  await expandAllHrOneListings(page)

  const cards = await readRenderedJobCards(page)
  const applyUrls = await captureApplyUrls(page)

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error('Presidency University public HROne vacancies surface no longer renders job cards')
  }

  if (applyUrls.length !== cards.length) {
    throw new Error('Presidency University public HROne apply links no longer align with rendered job cards')
  }

  await new Promise((resolve) => setTimeout(resolve, 2000))

  return cards.map((card, index) => ({
    ...card,
    applyUrl: applyUrls[index],
  }))
}

export const createPresidencyUniversityScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const browserFactory = options.launchBrowser || launchBrowser
    const pageFactory = options.createPage || createOptimizedPage
    const readRenderedCards = options.readRenderedCards || readRenderedHrOneCards
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Presidency University careers page no longer matches the verified official careers surface')
    }

    const vacanciesUrl = extractVacanciesBoardUrl(careersHtml)
    if (vacanciesUrl !== HRONE_VACANCIES_URL) {
      throw new Error('Presidency University careers page no longer links to the verified public HROne vacancies surface')
    }

    let browser
    try {
      browser = await browserFactory()
      const page = await pageFactory(browser)
      await page.goto(vacanciesUrl, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector(HRONE_CARD_SELECTOR, {
        timeout: config.jobListingTimeoutMs || 30000,
      })

      if (!isTrustedBoardPageUrl(page.url())) {
        throw new Error('Presidency University public vacancies handoff no longer resolves to the trusted HROne board')
      }

      const jobs = extractHrOneJobs(await readRenderedCards(page))
      const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

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

export const run = async (options = {}) => createPresidencyUniversityScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Presidency University scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
