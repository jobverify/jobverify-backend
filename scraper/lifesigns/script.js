import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lifesigns'
export const COMPANY = 'LifeSigns'
export const HOMEPAGE_URL = 'https://www.lifesigns.us/'
export const CAREERS_URL = 'https://www.lifesigns.us/careers/'
export const EXPECTED_ROLE_CARDS = {
  '/careers/junior-video-editor/': {
    title: 'Junior Video Editor',
    employmentType: 'Full-Time',
    city: 'Chennai',
  },
  '/careers/junior-visual-designer/': {
    title: 'Junior Visual Designer',
    employmentType: 'Full-Time',
    city: 'Chennai',
  },
  '/careers/lead-network-engineer/': {
    title: 'Lead Network Engineer',
    employmentType: 'Full-Time',
    city: 'Delhi',
  },
  '/careers/biomedical-field-implementation-engineer-icu-solutions/': {
    title: 'Biomedical Field Implementation Engineer',
    employmentType: 'Full-Time',
    city: 'Bangalore',
  },
  '/careers/digital-patient-monitoring-executive-cmt/': {
    title: 'Digital Patient Monitoring Executive (Central Monitoring Executive)',
    employmentType: 'Full-Time',
    city: 'Chennai',
  },
  '/careers/hospital-support-executive-hse/': {
    title: 'Hospital Support Executive (HSE)',
    employmentType: 'Full-Time',
    city: 'Mysore',
  },
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/full/.test(normalized)) return 'Full-Time'
  if (/part/.test(normalized)) return 'Part-Time'
  if (/intern/.test(normalized)) return 'Internship'
  if (/contract/.test(normalized)) return 'Contract'
  return normalizeWhitespace(value)
}

const normalizePathname = (value, baseUrl = CAREERS_URL) => {
  try {
    const url = new URL(value, baseUrl)
    return url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`
  } catch {
    return null
  }
}

const hasPathLink = (snapshot, pathname) => (Array.isArray(snapshot?.links) ? snapshot.links : [])
  .some((href) => normalizePathname(href, snapshot?.url || HOMEPAGE_URL) === pathname)

const buildJobId = (pathname) => {
  const slug = normalizePathname(pathname)
    ?.split('/')
    .filter(Boolean)
    .at(-1)

  return slug ? `${SOURCE}-${slug}` : null
}

const buildRoleUrl = (pathname) => {
  try {
    return new URL(normalizePathname(pathname) || '', HOMEPAGE_URL).toString()
  } catch {
    return CAREERS_URL
  }
}

export const hasOfficialHomepageSignal = (snapshot = {}) => {
  const title = normalizeWhitespace(snapshot.title) || ''
  const text = (normalizeWhitespace(snapshot.text) || '').toLowerCase()

  return snapshot.status === 200
    && normalizePathname(snapshot.url, HOMEPAGE_URL) === '/'
    && title === 'Lifesigns | Intelligent patient monitoring for smarter decisions'
    && text.includes('ai-powered patient monitoring')
    && text.includes('predictive intelligence and continuous monitoring')
    && hasPathLink(snapshot, '/careers/')
}

export const hasOfficialCareersSignal = (snapshot = {}) => {
  const title = normalizeWhitespace(snapshot.title) || ''
  const text = normalizeWhitespace(snapshot.text) || ''
  const normalizedText = text.toLowerCase()

  return snapshot.status === 200
    && normalizePathname(snapshot.url, CAREERS_URL) === '/careers/'
    && title === 'Careers at Lifesigns | Challenge convention'
    && normalizedText.includes('we challenge')
    && normalizedText.includes('see open roles')
    && normalizedText.includes('explore our open roles')
    && normalizedText.includes("didn't see the role you're looking for?")
    && normalizedText.includes('leave a message')
}

const parseRoleCard = (roleCard = {}) => {
  const pathname = normalizePathname(roleCard.href, CAREERS_URL)
  if (!pathname || pathname === '/careers/') return null

  const text = normalizeWhitespace(roleCard.text)
  if (!text) return null

  const employmentMatch = /(Full-Time|Full time|Full Time|Part-Time|Part time|Internship|Contract)/i.exec(text)
  if (!employmentMatch) return null

  const title = normalizeWhitespace(text.slice(0, employmentMatch.index))
  const employmentType = normalizeEmploymentType(employmentMatch[1])
  const city = normalizeWhitespace(text.slice(employmentMatch.index + employmentMatch[0].length))

  if (!title || !employmentType || !city) return null

  return {
    pathname,
    title,
    employmentType,
    city,
  }
}

export const extractVerifiedOpenRoles = (snapshot) => {
  if (!hasOfficialCareersSignal(snapshot)) {
    throw new Error('LifeSigns careers page no longer matches the verified official public surface')
  }

  const expectedPaths = Object.keys(EXPECTED_ROLE_CARDS)
  const parsedCards = (Array.isArray(snapshot?.roleCards) ? snapshot.roleCards : [])
    .map(parseRoleCard)
    .filter(Boolean)

  if (parsedCards.length !== expectedPaths.length) {
    throw new Error('LifeSigns rendered public openings changed materially')
  }

  const cardsByPath = new Map()

  for (const card of parsedCards) {
    if (cardsByPath.has(card.pathname)) {
      throw new Error(`LifeSigns duplicated rendered opening "${card.pathname}"`)
    }

    const expected = EXPECTED_ROLE_CARDS[card.pathname]
    if (!expected) {
      throw new Error(`LifeSigns unexpected rendered opening "${card.pathname}"`)
    }

    if (card.title !== expected.title) {
      throw new Error(`LifeSigns title drifted for "${card.pathname}"`)
    }

    if (card.employmentType !== expected.employmentType) {
      throw new Error(`LifeSigns employment type drifted for "${card.pathname}"`)
    }

    if (card.city !== expected.city) {
      throw new Error(`LifeSigns location drifted for "${card.pathname}"`)
    }

    cardsByPath.set(card.pathname, card)
  }

  return expectedPaths.map((pathname) => {
    const expected = EXPECTED_ROLE_CARDS[pathname]
    const jobId = buildJobId(pathname)
    const roleUrl = buildRoleUrl(pathname)

    if (!cardsByPath.has(pathname) || !jobId) {
      throw new Error(`LifeSigns missing verified opening "${pathname}"`)
    }

    return {
      title: expected.title,
      company: COMPANY,
      department: null,
      location: `${expected.city}, India`,
      city: expected.city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: roleUrl,
      applyUrl: roleUrl,
      employmentType: expected.employmentType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    }
  })
}

const createBrowserSnapshotFetcher = async ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const page = await createOptimizedPageImpl(browser)
    await page.setUserAgent(USER_AGENT)

    return {
      close: async () => browser.close(),
      fetchPageSnapshot: async (url) => {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        })

        await page.waitForSelector('body', { timeout: 30000 })

        if (url === CAREERS_URL) {
          await page.waitForFunction(
            () => Array.from(document.querySelectorAll('main a[href^="/careers/"]'))
              .filter((anchor) => {
                const href = anchor.getAttribute('href') || ''
                return href.split('/').filter(Boolean).length > 1
              })
              .length >= 4,
            { timeout: 30000 },
          )
        }

        const snapshot = await page.evaluate(() => {
          const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

          return {
            url: window.location.href,
            title: document.title,
            text: normalize(document.body?.innerText || ''),
            links: Array.from(document.querySelectorAll('a[href]'))
              .map((anchor) => anchor.getAttribute('href'))
              .filter(Boolean),
            roleCards: Array.from(document.querySelectorAll('main a[href^="/careers/"]'))
              .map((anchor) => {
                const href = anchor.getAttribute('href') || ''
                if (href.split('/').filter(Boolean).length <= 1) {
                  return null
                }

                return {
                  href,
                  text: normalize(anchor.textContent || ''),
                }
              })
              .filter(Boolean),
          }
        })

        return {
          status: response?.status() ?? 0,
          ...snapshot,
        }
      },
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

export const createLifeSignsScraper = () => ({
  async run({ fetchPageSnapshot } = {}) {
    let browserContext = null

    try {
      if (!fetchPageSnapshot) {
        browserContext = await createBrowserSnapshotFetcher()
        fetchPageSnapshot = browserContext.fetchPageSnapshot
      }

      const homepageSnapshot = await fetchPageSnapshot(HOMEPAGE_URL)
      if (!hasOfficialHomepageSignal(homepageSnapshot)) {
        throw new Error('LifeSigns homepage no longer matches the verified official public surface')
      }

      const careersSnapshot = await fetchPageSnapshot(CAREERS_URL)
      const jobs = extractVerifiedOpenRoles(careersSnapshot)
      const scrapedAt = new Date().toISOString()

      return jobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl,
        scrapedAt,
        companyCareerPage: CAREERS_URL,
        companyDomain: 'lifesigns.us',
        atsPlatform: 'official-company-careers',
      }))
    } finally {
      if (browserContext) {
        await browserContext.close()
      }
    }
  },
})

export const run = async (options = {}) => createLifeSignsScraper().run(options)

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
