import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { SCHOOLNET_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = SCHOOLNET_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const RECRUITMENT_PORTAL_URL = PROVIDER_METADATA.recruitmentPortalUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'
const ROLE_ACTION_PATTERN = /^(view details|apply)$/i

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

const normalizeHtmlText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' '),
)

const extractTitle = (html = '') => normalizeWhitespace(
  String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null,
)

const extractCanonicalUrl = (html = '') =>
  String(html ?? '').match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? null

const normalizeRoleLine = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (ROLE_ACTION_PATTERN.test(normalized)) return null
  if (/^(image\s*)+$/i.test(normalized) || /^imageimage$/i.test(normalized)) return null
  return normalized
}

const toRoleCardText = (html = '') => String(html ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|article|section|h[1-6]|button|a)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split(/\r?\n/)
  .map((line) => normalizeRoleLine(line))
  .filter(Boolean)
  .join('\n')

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || null

const toIsoDate = (value) => {
  const match = normalizeWhitespace(value)?.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || /as per requirement/i.test(normalized)) return null

  const slashParts = normalized.split('/').map((part) => normalizeWhitespace(part)).filter(Boolean)
  if (slashParts.length > 1) return slashParts.at(-1) || null

  const commaParts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  if (commaParts.length > 1) return commaParts[0] || null

  if (/remote/i.test(normalized)) return null
  return normalized
}

const formatLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return 'India'
  if (/\bindia\b/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const deriveRemoteStatus = (location) => (/remote/i.test(normalizeWhitespace(location) || '') ? 'Remote' : 'On-site')

const extractTextBetweenMarkers = (value, startMarker, endMarker) => {
  const source = normalizeWhitespace(value) || ''
  if (!source) return null

  const startIndex = source.indexOf(startMarker)
  if (startIndex < 0) return null

  const fromStart = source.slice(startIndex + startMarker.length)
  if (!endMarker) return fromStart.trim() || null

  const endIndex = fromStart.indexOf(endMarker)
  const extracted = endIndex >= 0 ? fromStart.slice(0, endIndex) : fromStart
  return extracted.trim() || null
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = (normalizeHtmlText(rawHtml) || '').toLowerCase()
  const canonicalUrl = extractCanonicalUrl(rawHtml)

  return extractTitle(rawHtml) === 'Digitising Education | ICT Labs & English Language Training'
    && (
      canonicalUrl === 'https://www.schoolnetindia.com/careers/'
      || canonicalUrl === 'https://www.schoolnetindia.com/more'
    )
    && normalized.includes('unlock your potential with our team of visionaries')
    && normalized.includes('browse jobs')
    && normalized.includes('job openings')
}

export const hasOfficialRecruitmentPortalSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = (normalizeHtmlText(rawHtml) || '').toLowerCase()

  return extractTitle(rawHtml)?.toLowerCase() === 'hms'
    && (
      (
        normalized.includes('welcome back')
        && normalized.includes('sign in to your hms account')
        && normalized.includes('hiring management system')
        && normalized.includes('browse jobs')
        && normalized.includes('schoolnet india ltd., india')
      )
      || (
        /<div[^>]+id=["']root["'][^>]*><\/div>/i.test(rawHtml)
        && /\/assets\/index-[^"']+\.(?:js|css)/i.test(rawHtml)
      )
    )
}

export const parseRoleCardText = (text = '', urls = {}) => {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((line) => normalizeRoleLine(line))
    .filter(Boolean)

  if (lines.length < 4) return null

  const title = lines[0]
  const location = lines[1]
  const employmentType = lines[2]
  const metadataLineIndex = lines.findIndex((line) => /experience:/i.test(line) && /posted:/i.test(line))

  if (!title || !location || !employmentType || metadataLineIndex < 0) return null

  const metadataLine = lines[metadataLineIndex]
  const experienceRequired = extractTextBetweenMarkers(metadataLine, 'Experience:', '|')
  const postingDate = toIsoDate(metadataLine.match(/Posted:\s*(\d{2}-\d{2}-\d{4})/i)?.[1] || null)
  const description = normalizeWhitespace(lines.slice(metadataLineIndex + 1).join(' '))
  const detailUrl = urls.detailUrl || CAREERS_URL
  const applyUrl = urls.applyUrl || detailUrl
  const jobIdFromUrl = urls.detailUrl
    ? slugify(
      (() => {
        try {
          const pathname = new URL(detailUrl).pathname
          return pathname.split('/').filter(Boolean).at(-1) || title
        } catch {
          return title
        }
      })(),
    )
    : null
  const jobId = jobIdFromUrl || slugify(title)

  if (!jobId) return null

  return {
    title,
    company: COMPANY_NAME,
    department: null,
    location: formatLocation(location),
    city: extractCity(location),
    state: null,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: detailUrl,
    applyUrl,
    employmentType,
    experienceRequired: experienceRequired || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate,
    closingDate: null,
    jobDescription: description,
    remoteStatus: deriveRemoteStatus(location),
  }
}

export const buildJobsFromRoleCards = (cards = [], { scrapedAt } = {}) => {
  const seen = new Set()

  return cards
    .map((card) => parseRoleCardText(card?.text, {
      detailUrl: card?.detailUrl,
      applyUrl: card?.applyUrl,
    }))
    .filter((job) => {
      if (!job || seen.has(job.jobId)) return false
      seen.add(job.jobId)
      return true
    })
    .map((job) => ({
      ...job,
      source: SOURCE,
      link: job.sourceUrl,
      scrapedAt,
    }))
}

export const extractRoleCardsFromCareersHtml = (html = '') => {
  const cards = Array.from(
    String(html ?? '').matchAll(/<article[^>]*class=["'][^"']*job-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi),
    (match) => ({
      text: toRoleCardText(match[1]),
      detailUrl: match[1].match(/href=["']([^"']+)["'][^>]*>\s*View Details/i)?.[1] || null,
      applyUrl: match[1].match(/href=["']([^"']+)["'][^>]*>\s*Apply/i)?.[1] || null,
    }),
  ).filter((card) => card.text && /experience:/i.test(card.text) && /posted:/i.test(card.text))

  if (cards.length > 0) {
    return cards
  }

  const jobOpeningsText = normalizeHtmlText(html)
  if (!jobOpeningsText?.includes('Job Openings')) {
    return []
  }

  const [, afterJobOpenings] = jobOpeningsText.split('Job Openings')
  if (!afterJobOpenings) {
    return []
  }

  const employmentTypes = [
    'Contract/ Full-time',
    'Full-time',
    'Part-time',
    'Internship',
  ]

  const toFallbackRoleCard = (segment) => {
    const normalized = normalizeWhitespace(segment)
    if (!normalized) return null

    const metadataMatch = normalized.match(/Experience:\s*([^|]+)\|\s*Posted:\s*(\d{2}-\d{2}-\d{4})/i)
    if (!metadataMatch?.index) return null

    const header = normalized.slice(0, metadataMatch.index).trim()
    const description = normalized.slice(metadataMatch.index + metadataMatch[0].length).trim()
    const employmentType = employmentTypes.find((value) => header.endsWith(value))
    if (!employmentType) return null

    const titleAndLocation = header.slice(0, header.length - employmentType.length).trim()
    const locationMatch = titleAndLocation.match(
      /(Remote\s*\/\s*[A-Za-z ]+|As per requirement|Noida|Kolkata|Mumbai|Delhi|Gurgaon|Gurugram|Bangalore|Bengaluru|Pune|Hyderabad|Chennai)$/i,
    )
    if (!locationMatch?.index && locationMatch?.index !== 0) return null

    const location = locationMatch[0].trim()
    const title = titleAndLocation.slice(0, locationMatch.index).trim()
    if (!title || !location) return null

    return {
      text: [
        title,
        location,
        employmentType,
        metadataMatch[0].trim(),
        description,
      ].join('\n'),
      detailUrl: null,
      applyUrl: null,
    }
  }

  return afterJobOpenings
    .split(/View Details\s+Apply/gi)
    .map((segment) => toFallbackRoleCard(segment))
    .filter(Boolean)
}

export const createBrowserRoleCardsLoader = ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => ({
  async load() {
    const browser = await launchBrowserImpl()

    try {
      const page = await createOptimizedPageImpl(browser)
      const response = await page.goto(CAREERS_URL, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      })

      if (response && !response.ok()) {
        throw new Error(`HTTP ${response.status()} for ${CAREERS_URL}`)
      }

      await page.waitForSelector('body', { timeout: config.jobListingTimeoutMs })

      return page.evaluate((actionPatternSource) => {
        const actionPattern = new RegExp(actionPatternSource, 'i')
        const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
        const seen = new Set()
        const cards = []

        const findContainer = (node) => {
          let current = node?.parentElement || null
          while (current) {
            const text = normalize(current.innerText)
            if (/experience:/i.test(text) && /posted:/i.test(text)) {
              return current
            }
            current = current.parentElement
          }
          return null
        }

        for (const node of Array.from(document.querySelectorAll('a[href], button'))) {
          const label = normalize(node.textContent)
          if (!actionPattern.test(label)) continue

          const container = findContainer(node)
          if (!container) continue

          const text = normalize(container.innerText)
          if (!text) continue

          const heading = container.querySelector('h1, h2, h3, h4, h5, h6, strong, b')
          const title = normalize(heading?.textContent || text.split('\n')[0] || '')
          const detailAnchor = Array.from(container.querySelectorAll('a[href]'))
            .find((anchor) => /view details/i.test(normalize(anchor.textContent)))
          const applyAnchor = Array.from(container.querySelectorAll('a[href]'))
            .find((anchor) => /apply/i.test(normalize(anchor.textContent)))
          const key = `${title}::${detailAnchor?.href || ''}::${applyAnchor?.href || ''}`

          if (!title || seen.has(key)) continue
          seen.add(key)

          cards.push({
            text: container.innerText,
            detailUrl: detailAnchor?.href || null,
            applyUrl: applyAnchor?.href || detailAnchor?.href || null,
          })
        }

        return cards
      }, ROLE_ACTION_PATTERN.source)
    } finally {
      await browser.close()
    }
  },
})

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'schoolnetindia-official',
  timeoutMs: 15000,
})

export const createSchoolnetIndiaScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    loadRoleCards,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('The official Schoolnet India careers page no longer matches the verified public surface')
    }

    const recruitmentPortalHtml = await fetchText(RECRUITMENT_PORTAL_URL)
    if (!hasOfficialRecruitmentPortalSignal(recruitmentPortalHtml)) {
      throw new Error('The official Schoolnet India recruitment portal no longer matches the verified public surface')
    }

    let resolvedRoleCards
    if (loadRoleCards) {
      resolvedRoleCards = await loadRoleCards()
    } else {
      resolvedRoleCards = extractRoleCardsFromCareersHtml(careersHtml)
      if (resolvedRoleCards.length === 0) {
        resolvedRoleCards = await createBrowserRoleCardsLoader().load()
      }
    }

    const jobs = buildJobsFromRoleCards(resolvedRoleCards, { scrapedAt: now() })
    if (jobs.length === 0) {
      throw new Error('Schoolnet India public role cards no longer match the verified official careers surface')
    }

    return jobs
  },
})

export const run = async (options = {}) => createSchoolnetIndiaScraper().run(options)

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
