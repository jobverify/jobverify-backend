import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseJavaScriptLiteral } from '../../scraper-support/utils/safeLiteral.js'
import { withRetry } from '../../scraper-support/utils/retry.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'celebaltechnologies'
export const COMPANY = 'Celebal Technologies'
export const VERIFIED_AT = '2026-07-14'
export const CAREERS_URL = 'https://celebaltech.com/careers'
export const CAREERS_SITE_ORIGIN = 'https://celebaltech.com'
export const PAGE_ONE_REQUIRED_ROLE_IDS = [
  'data-scientist-fresher',
  'data-engineer-fresher',
  'data-engineer',
]
export const SCRAPER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  companyCareerPage: CAREERS_URL,
  companyDomain: 'celebaltech.com',
  countryFilter: 'India',
  atsPlatform: 'nextjs-first-party-bundle',
  paginationStrategy: 'client-side-pagination-from-public-nextjs-jobs-bundle',
  extractionStrategy: 'official-careers-html+public-nextjs-chunk-dataset',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_CITY_ALIASES = new Map([
  ['ahmedabad', 'Ahmedabad'],
  ['bangalore', 'Bengaluru'],
  ['bengaluru', 'Bengaluru'],
  ['bhubaneswar', 'Bhubaneswar'],
  ['chandigarh', 'Chandigarh'],
  ['chennai', 'Chennai'],
  ['coimbatore', 'Coimbatore'],
  ['delhi', 'Delhi'],
  ['gurgaon', 'Gurugram'],
  ['gurugram', 'Gurugram'],
  ['hyderabad', 'Hyderabad'],
  ['indore', 'Indore'],
  ['jaipur', 'Jaipur'],
  ['kochi', 'Kochi'],
  ['kolkata', 'Kolkata'],
  ['lucknow', 'Lucknow'],
  ['mohali', 'Mohali'],
  ['mumbai', 'Mumbai'],
  ['mysore', 'Mysuru'],
  ['mysuru', 'Mysuru'],
  ['nagpur', 'Nagpur'],
  ['navi mumbai', 'Navi Mumbai'],
  ['noida', 'Noida'],
  ['pune', 'Pune'],
  ['thiruvananthapuram', 'Thiruvananthapuram'],
  ['trivandrum', 'Thiruvananthapuram'],
  ['vadodara', 'Vadodara'],
])

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&#x2F;/gi, '/')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtmlToText = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(li|p|div|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchText = async (url) =>
  withRetry(async () => {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/javascript,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: createTimeoutSignal(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }

    return response.text()
  }, {
    attempts: 3,
    baseDelayMs: 2000,
    label: SOURCE,
  })

export const hasOfficialCareersSurface = (html) => {
  const page = String(html ?? '')

  return /<title[^>]*>\s*Careers - Celebal Technologies\s*<\/title>/i.test(page)
    && /<meta[^>]+name=["']description["'][^>]+content=["']Empower the future you imagine["']/i.test(page)
    && /Open Positions/i.test(page)
    && /jobs available/i.test(page)
    && /\/careers\/[a-z0-9-]+/i.test(page)
}

export const extractAdvertisedJobCount = (html) => {
  const match = String(html ?? '').match(/(\d+)\s*(?:<!--\s*-->\s*)?jobs available/i)
  if (!match) return null

  const parsed = Number.parseInt(match[1], 10)
  return Number.isInteger(parsed) ? parsed : null
}

export const extractVisibleListingIds = (html) => [...String(html ?? '').matchAll(
  /href=["']\/careers\/([a-z0-9-]+)["']/gi,
)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)
  .filter((value, index, all) => all.indexOf(value) === index)

export const extractChunkUrls = (html) => [...String(html ?? '').matchAll(
  /<script[^>]+src=["']([^"']*\/_next\/static\/chunks\/[^"']+\.js)["'][^>]*>/gi,
)]
  .map((match) => {
    try {
      return new URL(match[1], CAREERS_SITE_ORIGIN).toString()
    } catch {
      return null
    }
  })
  .filter(Boolean)
  .filter((value, index, all) => all.indexOf(value) === index)

const prioritizeChunkUrls = (urls) => [...urls]
  .map((url, index) => {
    let score = 2

    if (/\/_next\/static\/chunks\/\d+[^/]*\.js$/i.test(url)) {
      score = 0
    } else if (/\/_next\/static\/chunks\/pages\/careers/i.test(url)) {
      score = 1
    }

    return { url, index, score }
  })
  .sort((left, right) => left.score - right.score || left.index - right.index)
  .map((entry) => entry.url)

const extractBalancedArrayLiteral = (text, startIndex) => {
  let depth = 0
  let inString = false
  let quote = ''
  let escaped = false

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }

      if (char === '\\') {
        escaped = true
        continue
      }

      if (char === quote) {
        inString = false
        quote = ''
      }

      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true
      quote = char
      continue
    }

    if (char === '[') {
      depth += 1
    } else if (char === ']') {
      depth -= 1
      if (depth === 0) {
        return text.slice(startIndex, index + 1)
      }
    }
  }

  return null
}

const extractJobsArrayLiteral = (chunkText) => {
  const source = String(chunkText ?? '')
  const match = /let\s+[A-Za-z_$][\w$]*=\[\s*\{id:"/i.exec(source)
  if (!match) {
    throw new Error('Celebal first-party jobs bundle no longer exposes the expected array export')
  }

  const startIndex = source.indexOf('[', match.index)
  if (startIndex === -1) {
    throw new Error('Celebal first-party jobs bundle no longer exposes a readable jobs array')
  }

  const literal = extractBalancedArrayLiteral(source, startIndex)
  if (!literal) {
    throw new Error('Celebal first-party jobs bundle no longer exposes a balanced jobs array')
  }

  return literal
}

export const parseJobsBundle = (chunkText) => {
  const literal = extractJobsArrayLiteral(chunkText)
  const roles = parseJavaScriptLiteral(literal)

  if (!Array.isArray(roles) || roles.length === 0) {
    throw new Error('Celebal first-party jobs bundle no longer exposes any roles')
  }

  const hasExpectedShape = roles.every((role) =>
    role
    && typeof role.id === 'string'
    && typeof role.title === 'string'
    && typeof role.location === 'string'
    && Array.isArray(role.skills),
  )

  if (!hasExpectedShape) {
    throw new Error('Celebal first-party jobs bundle no longer matches the expected role schema')
  }

  return roles
}

export const buildDetailUrl = (roleId) => `${CAREERS_URL}/${roleId}`

export const extractIndiaCities = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return []

  return normalized
    .split(/[|,/]+/)
    .map((part) => normalizeWhitespace(part)?.toLowerCase() || null)
    .filter(Boolean)
    .map((part) => INDIA_CITY_ALIASES.get(part) || null)
    .filter(Boolean)
    .filter((city, index, all) => all.indexOf(city) === index)
}

export const isIndiaRoleLocation = (location) => extractIndiaCities(location).length > 0

const normalizeSkills = (skills) => (Array.isArray(skills) ? skills : [])
  .map((skill) => normalizeWhitespace(skill))
  .filter(Boolean)

const normalizeQualifications = (role) => {
  const values = Array.isArray(role.qualifications)
    ? role.qualifications
    : Array.isArray(role.qualification)
      ? role.qualification
      : role.qualifications || role.qualification
        ? [role.qualifications || role.qualification]
        : []

  return values
    .map((value) => stripHtmlToText(value))
    .filter(Boolean)
}

const buildDescription = (role) => {
  const sections = []
  const description = stripHtmlToText(role.description)
  const responsibilities = (Array.isArray(role.responsibilities) ? role.responsibilities : [])
    .map((value) => stripHtmlToText(value))
    .filter(Boolean)
  const qualifications = normalizeQualifications(role)

  if (description) sections.push(description)
  if (responsibilities.length > 0) {
    sections.push(`Responsibilities: ${responsibilities.join(' ')}`)
  }
  if (qualifications.length > 0) {
    sections.push(`Qualifications: ${qualifications.join(' ')}`)
  }

  return sections.join('\n\n') || null
}

const normalizeExperience = (value) => normalizeWhitespace(value)

const normalizeEmploymentType = (workMode) => {
  const normalized = normalizeWhitespace(workMode)?.toLowerCase() || ''

  if (!normalized) return null
  if (normalized.includes('internship') && normalized.includes('fulltime')) {
    return 'Internship + Full-time'
  }
  if (normalized.includes('internship')) return 'Internship'
  if (normalized.includes('contract')) return 'Contract'
  return 'Full-time'
}

const buildIndiaLocation = (location) => {
  const cities = extractIndiaCities(location)
  if (cities.length === 0) return 'India'

  return `${cities.join(', ')}, India`
}

export const normalizeRole = (role, { now = () => new Date().toISOString() } = {}) => {
  const cities = extractIndiaCities(role.location)
  const qualifications = normalizeQualifications(role)
  const detailUrl = buildDetailUrl(role.id)

  return {
    jobId: role.id,
    requisitionId: role.id,
    title: normalizeWhitespace(role.title),
    company: COMPANY,
    department: normalizeWhitespace(role.area),
    location: buildIndiaLocation(role.location),
    city: cities[0] || null,
    link: detailUrl,
    applyUrl: detailUrl,
    sourceUrl: detailUrl,
    source: SOURCE,
    employmentType: normalizeEmploymentType(role.workMode),
    experienceRequired: normalizeExperience(role.exp),
    jobDescription: buildDescription(role),
    minimumQualification: qualifications[0] || null,
    preferredQualification: qualifications.length > 1 ? qualifications.slice(1).join(' | ') : null,
    requiredSkills: normalizeSkills(role.skills),
    postingDate: null,
    closingDate: null,
    scrapedAt: now(),
  }
}

const findJobsBundle = async (chunkUrls, fetchText, visibleIds) => {
  let lastError = null

  for (const chunkUrl of prioritizeChunkUrls(chunkUrls)) {
    const chunkText = await fetchText(chunkUrl)

    try {
      const roles = parseJobsBundle(chunkText)
      const exposesVisibleIds = visibleIds.every((visibleId) =>
        roles.some((role) => role.id === visibleId),
      )

      if (!exposesVisibleIds) {
        lastError = new Error(
          `Celebal first-party jobs bundle no longer includes the visible page-one roles from ${CAREERS_URL}`,
        )
        continue
      }

      return roles
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(
    `Celebal first-party jobs bundle no longer matches the official careers surface${lastError?.message ? `: ${lastError.message}` : ''}`,
  )
}

export const createCelebalTechnologiesScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSurface(careersHtml)) {
      throw new Error('Celebal verified official careers surface no longer matches the trusted first-party page')
    }

    const advertisedJobCount = extractAdvertisedJobCount(careersHtml)
    const visibleIds = extractVisibleListingIds(careersHtml)
    const chunkUrls = extractChunkUrls(careersHtml)

    if (visibleIds.length === 0) {
      throw new Error('Celebal official careers page no longer exposes visible role detail links')
    }

    if (chunkUrls.length === 0) {
      throw new Error('Celebal official careers page no longer exposes public Next.js chunks')
    }

    const roles = await findJobsBundle(chunkUrls, fetchText, visibleIds)

    if (Number.isInteger(advertisedJobCount) && roles.length !== advertisedJobCount) {
      throw new Error('Celebal advertised job count no longer matches the public first-party jobs bundle')
    }

    const jobs = roles
      .filter((role) => isIndiaRoleLocation(role.location))
      .map((role) => normalizeRole(role, { now }))

    if (jobs.length === 0) {
      throw new Error('Celebal first-party jobs bundle no longer exposes India roles')
    }

    return jobs
  },
})

export const run = async (options = {}) => createCelebalTechnologiesScraper().run(options)

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
