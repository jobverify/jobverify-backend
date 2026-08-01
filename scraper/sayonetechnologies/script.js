import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { filterIndiaJobs } from '../../scraper-support/utils/indiaLocationFilter.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'sayonetechnologies'
export const COMPANY = 'SayOne Technologies'
export const CAREERS_PAGE_URL = 'https://www.sayonetech.com/career/'
export const JOB_CARD_SELECTOR = '.job-offer-card'
export const VIEW_JOB_BUTTON_SELECTOR = '.job-offer-card button'
export const MODAL_TITLE_SELECTOR = '.job-detail-modal .modal-title'
export const DEFAULT_APPLY_URL = 'mailto:careers@sayonetech.com'

const NAVIGATION_TIMEOUT_MS = 60000
const PAGE_SETTLE_MS = 6000
const DETAIL_SETTLE_MS = 600

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeTextBlock = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return normalized || null
}

const splitTextBlockLines = (value) => (normalizeTextBlock(value) || '')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || null

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const segments = normalized
    .split(',')
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean)

  for (const segment of [...segments].reverse()) {
    const city = normalizeCity(segment)
    if (city && !/^india$/i.test(city)) return city
  }

  return normalizeCity(normalized)
}

export const hasOfficialCareersSignal = (pageData = {}) => {
  const title = normalizeWhitespace(pageData.title)
  const url = normalizeWhitespace(pageData.url)
  const text = String(pageData.text ?? '')

  return title === 'Careers | Jobs in Kochi | SayOne'
    && url === CAREERS_PAGE_URL
    && /Find the Right Place/i.test(text)
    && /Are You Ready to be an Integral Part of SayOne\?/i.test(text)
    && /\bJob Offers\b/i.test(text)
    && /Career Email:\s*careers@sayonetech\.com/i.test(text)
}

export const hasExplicitNoVacanciesSignal = (pageData = {}) => {
  const text = String(pageData.text ?? '')

  return /\bNo vacancies available\b/i.test(text)
    && /Please check back later for new opportunities/i.test(text)
}

const extractDetailSection = (detail, headingPattern) =>
  detail.sections?.find((section) => headingPattern.test(section.heading || ''))?.content || null

const buildJobId = ({ title, location, experience }) => slugify([
  title,
  location,
  experience,
].filter(Boolean).join(' ')) || null

const buildJobDescription = ({ shortDescription, description, responsibilities, requirements }) => {
  const parts = []
  const summary = normalizeTextBlock(description) || normalizeTextBlock(shortDescription)
  const responsibilitiesLines = splitTextBlockLines(responsibilities)
  const requirementsLines = splitTextBlockLines(requirements)

  if (summary) parts.push(`Description: ${summary}`)
  if (responsibilitiesLines.length > 0) {
    parts.push(`Responsibilities:\n${responsibilitiesLines.map((line) => `- ${line}`).join('\n')}`)
  }
  if (requirementsLines.length > 0) {
    parts.push(`Requirements:\n${requirementsLines.map((line) => `- ${line}`).join('\n')}`)
  }

  return parts.join('\n\n') || null
}

const extractRequiredSkills = (requirements) => splitTextBlockLines(requirements)
  .filter((line) => !/^soft skills$/i.test(line))

export const buildJobFromCardAndDetail = (card = {}, detail = {}) => {
  const title = normalizeWhitespace(detail.title) || normalizeWhitespace(card.title)
  const location = normalizeWhitespace(detail.location) || normalizeWhitespace(card.location)
  const experience = normalizeWhitespace(detail.experience) || normalizeWhitespace(card.experience)
  const responsibilities = extractDetailSection(detail, /responsibilities/i)
  const requirements = extractDetailSection(detail, /requirements/i)
  const applyUrl = normalizeWhitespace(detail.applyUrl) || DEFAULT_APPLY_URL
  const jobId = buildJobId({ title, location, experience })

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city: deriveCity(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: CAREERS_PAGE_URL,
    applyUrl,
    employmentType: null,
    experienceRequired: experience,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractRequiredSkills(requirements),
    postingDate: null,
    closingDate: null,
    jobDescription: buildJobDescription({
      shortDescription: card.shortDescription,
      description: detail.description,
      responsibilities,
      requirements,
    }),
    remoteStatus: /\bremote\b/i.test(location || '') ? 'Remote' : 'On-site',
  }
}

const collectPageData = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
  await page.waitForSelector('body', { timeout: NAVIGATION_TIMEOUT_MS }).catch(() => null)
  await delay(PAGE_SETTLE_MS)

  return page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    text: document.body?.innerText || '',
  }))
}

const waitForRenderedJobs = async (page) => {
  await page.waitForFunction(
    (jobCardSelector) => (
      document.querySelectorAll(jobCardSelector).length > 0
      || /No vacancies available/i.test(document.body?.innerText || '')
    ),
    { timeout: NAVIGATION_TIMEOUT_MS },
    JOB_CARD_SELECTOR,
  ).catch(() => null)

  await delay(DETAIL_SETTLE_MS)

  return page.evaluate((jobCardSelector) => ({
    text: document.body?.innerText || '',
    jobCardCount: document.querySelectorAll(jobCardSelector).length,
  }), JOB_CARD_SELECTOR)
}

const readRenderedJobCards = async (page) => page.$$eval(JOB_CARD_SELECTOR, (cards) => cards.map((card, index) => ({
  index,
  title: card.querySelector('h4')?.textContent?.trim() || null,
  shortDescription: card.querySelector('.job-offer-card-body p')?.textContent?.trim() || null,
  experience: card.querySelector('.job-offer-card-type')?.textContent?.trim() || null,
  location: card.querySelector('.job-offer-card-location')?.textContent?.trim() || null,
  buttonText: card.querySelector('button')?.textContent?.trim() || null,
})))

const readJobDetailModal = async (page, cardIndex) => {
  const opened = await page.evaluate((index, buttonSelector) => {
    const button = document.querySelectorAll(buttonSelector)[index]
    if (!button) return false

    button.click()
    return true
  }, cardIndex, VIEW_JOB_BUTTON_SELECTOR)

  if (!opened) {
    throw new Error(`Unable to open SayOne Technologies job detail modal for card index ${cardIndex}`)
  }

  await page.waitForSelector(MODAL_TITLE_SELECTOR, { timeout: NAVIGATION_TIMEOUT_MS })
  await delay(DETAIL_SETTLE_MS)

  const detail = await page.evaluate(() => ({
    title: document.querySelector('.job-detail-modal .modal-title')?.textContent?.trim() || null,
    experience: document.querySelector('.job-detail-modal .job-meta-info span:nth-child(1)')?.textContent?.trim() || null,
    location: document.querySelector('.job-detail-modal .job-meta-info span:nth-child(2)')?.textContent?.trim() || null,
    description: document.querySelector('.job-detail-modal .job-description-full')?.textContent?.trim() || null,
    sections: Array.from(document.querySelectorAll('.job-detail-modal h6')).map((heading) => ({
      heading: heading.textContent?.trim() || '',
      content: heading.nextElementSibling?.innerText?.trim() || '',
    })),
    applyUrl: document.querySelector('.job-detail-modal a[href^="mailto:"]')?.href || null,
  }))

  await page.evaluate(() => {
    document.querySelector('.job-detail-modal .btn-close')?.click()
  })
  await page.waitForFunction(
    () => !document.body.classList.contains('modal-open'),
    { timeout: 15000 },
  ).catch(() => null)
  await delay(DETAIL_SETTLE_MS)

  return detail
}

const createBrowserContext = async ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const page = await createOptimizedPageImpl(browser)

    return {
      browser,
      page,
      close: async () => browser.close(),
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

export const createSayonetechnologiesScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    collectPageDataImpl = collectPageData,
    waitForRenderedJobsImpl = waitForRenderedJobs,
    readRenderedJobCardsImpl = readRenderedJobCards,
    readJobDetailModalImpl = readJobDetailModal,
    launchBrowserImpl = launchBrowser,
    createOptimizedPageImpl = createOptimizedPage,
    now = () => new Date().toISOString(),
  } = {}) {
    const browserContext = await createBrowserContext({
      launchBrowserImpl,
      createOptimizedPageImpl,
    })

    try {
      const pageData = await collectPageDataImpl(browserContext.page, CAREERS_PAGE_URL)
      if (!hasOfficialCareersSignal(pageData)) {
        throw new Error('SayOne Technologies careers page no longer matches the verified official public surface')
      }

      const renderedState = await waitForRenderedJobsImpl(browserContext.page)
      if ((renderedState.jobCardCount || 0) === 0) {
        if (hasExplicitNoVacanciesSignal(renderedState)) return []

        throw new Error(
          'SayOne Technologies public careers page did not render job cards or an explicit zero-vacancy state',
        )
      }

      const cards = await readRenderedJobCardsImpl(browserContext.page)
      if (cards.length === 0) {
        throw new Error('SayOne Technologies public careers page no longer exposes the expected job cards')
      }

      const selectedCards = Number.isInteger(maxJobs) ? cards.slice(0, maxJobs) : cards
      const jobs = []

      for (const card of selectedCards) {
        const detail = await readJobDetailModalImpl(browserContext.page, card.index)
        jobs.push(buildJobFromCardAndDetail(card, detail))
      }

      return filterIndiaJobs(jobs).map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      }))
    } finally {
      await browserContext.close()
    }
  },
})

export const run = async (options = {}) => createSayonetechnologiesScraper().run(options)

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
