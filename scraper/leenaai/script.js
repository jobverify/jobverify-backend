import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../utils/browser.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { LEENA_AI_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = LEENA_AI_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OPEN_ROLES_TAB_URL = PROVIDER_METADATA.openRolesTabUrl
export const OPEN_ROLES_SECTION_ID = 'open-roles-section'
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const ROLE_CARD_SELECTOR = `#${OPEN_ROLES_SECTION_ID} .sc-edKZPI`
const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'
const CAREERS_BUNDLE_SCRIPT_PATTERN =
  /<script[^>]+src=["']([^"']*\/_next\/static\/chunks\/pages\/careers-[^"']+\.js)["'][^>]*>/i
const LEENA_PYJAMAHR_ROLE_OBJECT_PATTERN =
  /\{[^{}]*link:"https:\/\/jobs\.pyjamahr\.com\/leena-ai\/(?:\\.|[^"\\])*"[^{}]*\}/g

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html = '') => normalizeWhitespace(
  String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
)

const extractCity = (location) => {
  const parts = normalizeWhitespace(location)?.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean) || []
  return parts[0] || null
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || null

const isIndiaRole = (location) => /\bindia\b/i.test(normalizeWhitespace(location) || '')

const decodeJsString = (value) => {
  const source = String(value ?? '')

  try {
    return JSON.parse(`"${source}"`)
  } catch {
    return source
      .replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
}

const extractJsStringProperty = (objectSource, key) => {
  const match = String(objectSource ?? '').match(
    new RegExp(`${key}:"((?:\\\\.|[^"\\\\])*)"`),
  )

  return normalizeWhitespace(match ? decodeJsString(match[1]) : null)
}

const normalizePyjamaHrJobUrl = (value) => {
  if (!value) return null

  try {
    const url = new URL(value)
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    const pathname = url.pathname.replace(/\/+$/, '')

    if (hostname !== 'jobs.pyjamahr.com') return null
    if (!pathname.startsWith('/leena-ai/')) return null

    return `https://jobs.pyjamahr.com${pathname}${url.search}`
  } catch {
    return null
  }
}

export const hasOfficialLeenaAiCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const title = extractTitle(page) || ''
  const text = (normalizeWhitespace(page) || '').toLowerCase()

  return title === 'Careers at Leena AI | Join Our Team in Agentic AI Innovation'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/leena\.ai\/careers["']/i.test(page)
    && text.includes('join our team where people power ai')
    && text.includes('see open roles')
    && text.includes('explore jobs')
    && text.includes('open roles')
  }

export const extractOpenRolesBundleUrl = (html = '') => {
  const match = String(html ?? '').match(CAREERS_BUNDLE_SCRIPT_PATTERN)
  if (!match) {
    throw new Error('Leena AI verified careers page no longer exposes the careers page bundle')
  }

  try {
    return new URL(match[1], CAREERS_URL).toString()
  } catch {
    throw new Error('Leena AI careers page bundle URL is no longer parseable')
  }
}

export const extractOpenRolesFromCareersBundle = (bundleJs = '') => {
  const seen = new Set()
  const roles = []

  for (const match of String(bundleJs ?? '').matchAll(LEENA_PYJAMAHR_ROLE_OBJECT_PATTERN)) {
    const objectSource = match[0]
    const title = extractJsStringProperty(objectSource, 'title')
    const location = extractJsStringProperty(objectSource, 'location')
    const department = extractJsStringProperty(objectSource, 'department')
    const link = normalizePyjamaHrJobUrl(extractJsStringProperty(objectSource, 'link'))
    const jobId = slugify(`${title} ${location}`)

    if (!title || !location || !link || !jobId || seen.has(jobId)) continue
    seen.add(jobId)

    roles.push({
      title,
      location,
      department,
      link,
    })
  }

  if (roles.length === 0) {
    throw new Error('Leena AI careers bundle no longer exposes the verified open roles data')
  }

  return roles
}

export const loadOpenRolesFromCareersBundle = async (careersHtml, fetchText = defaultFetchText) => {
  const bundleUrl = extractOpenRolesBundleUrl(careersHtml)
  const bundleJs = await fetchText(bundleUrl)
  return extractOpenRolesFromCareersBundle(bundleJs)
}

export const extractVisibleOpenRoles = (cards = [], { scrapedAt } = {}) => {
  const seen = new Set()

  return cards
    .map((card) => {
      const title = normalizeWhitespace(card?.title)
      const location = normalizeWhitespace(card?.location)
      const department = normalizeWhitespace(card?.department)
      const roleUrl = normalizePyjamaHrJobUrl(card?.link) || OPEN_ROLES_TAB_URL
      if (!title || !location || !isIndiaRole(location)) return null

      const jobId = slugify(`${title} ${location}`)
      if (!jobId || seen.has(jobId)) return null
      seen.add(jobId)

      return {
        title,
        company: COMPANY_NAME,
        department,
        location,
        city: extractCity(location),
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: roleUrl,
        applyUrl: roleUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        remoteStatus: /remote/i.test(location) ? 'Remote' : 'On-site',
        source: SOURCE,
        link: roleUrl,
        scrapedAt,
      }
    })
    .filter(Boolean)
}

export const createBrowserOpenRolesLoader = ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => ({
  async load() {
    const browser = await launchBrowserImpl()

    try {
      const page = await createOptimizedPageImpl(browser)
      const response = await page.goto(OPEN_ROLES_TAB_URL, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      })

      if (!response?.ok()) {
        throw new Error(`HTTP ${response?.status?.() ?? 'unknown'} for ${OPEN_ROLES_TAB_URL}`)
      }

      await page.waitForSelector(`#${OPEN_ROLES_SECTION_ID}`, { timeout: config.jobListingTimeoutMs })

      return page.evaluate(
        (selector) =>
          Array.from(document.querySelectorAll(selector))
            .map((card) => {
              const texts = Array.from(card.querySelectorAll('p'))
                .map((node) => (node.textContent || '').trim())
                .filter(Boolean)

              return {
                title: texts[0] || null,
                location: texts[1] || null,
              }
            })
            .filter((card) => card.title && card.location),
        ROLE_CARD_SELECTOR,
      )
    } finally {
      await browser.close()
    }
  },
})

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/javascript,text/javascript,*/*;q=0.8',
  },
  label: 'leenaai-official',
  timeoutMs: 15000,
})

export const createLeenaAiScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    loadOpenRoles,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialLeenaAiCareersSignals(careersHtml)) {
      throw new Error('Leena AI verified official careers page no longer matches the verified public surface')
    }

    if (!loadOpenRoles) {
      loadOpenRoles = () => loadOpenRolesFromCareersBundle(careersHtml, fetchText)
    }

    const cards = await loadOpenRoles()
    const jobs = extractVisibleOpenRoles(cards, { scrapedAt: now() })

    if (jobs.length === 0) {
      throw new Error('Leena AI open roles section no longer exposes the verified public role cards')
    }

    return jobs
  },
})

export const run = async (options = {}) => createLeenaAiScraper().run(options)

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
