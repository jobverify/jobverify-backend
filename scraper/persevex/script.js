import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'persevex'
export const COMPANY = 'Persevex'
export const HOMEPAGE_URL = 'https://www.persevex.com/'
export const CAREERS_URL = 'https://www.persevex.com/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_LOCATION_PATTERN = /\b(?:india|bangalore|bengaluru|pune)\b/i
const CARD_PATTERN = /<div class="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"[\s\S]*?<button class="w-full text-left[^"]*"[^>]*>([\s\S]*?)<\/button>/gi

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (...parts) => normalizeWhitespace(parts.filter(Boolean).join(' '))
  ?.toLowerCase()
  .replace(/['"]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const extractOpenRolesSection = (html) =>
  String(html ?? '').match(/<section[^>]+id=["']open-roles["'][^>]*>[\s\S]*?<\/section>/i)?.[0] || ''

const extractDisplayedRoleCount = (sectionHtml) => {
  const count = sectionHtml.match(/Showing\s*<span[^>]*>(\d+)<\/span>\s*role/i)?.[1]
  return count ? Number.parseInt(count, 10) : null
}

const extractTextValues = (html) =>
  [...String(html ?? '').matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

const extractBadges = (cardHtml) =>
  extractTextValues(
    cardHtml.match(/<div class="flex flex-wrap items-center gap-2 mb-2">([\s\S]*?)<\/div>/i)?.[1] ?? '',
  )

const extractMetadataValues = (cardHtml) =>
  extractTextValues(
    cardHtml.match(
      /<div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">([\s\S]*?)<\/div>/i,
    )?.[1] ?? '',
  )

const normalizeIndiaLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) return null
  if (/^remote$/i.test(location)) return 'Remote (India)'
  return location
}

const normalizeCompensation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.replace(/^💰\s*/u, '')
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const hybridCity = normalized.match(/\b(Bangalore|Bengaluru|Pune)\b/i)?.[1]
  if (!hybridCity) return null

  return /^bengaluru$/i.test(hybridCity) ? 'Bangalore' : hybridCity
}

const normalizeWorkplaceType = (location) => {
  const normalized = normalizeWhitespace(location)?.toLowerCase()
  if (!normalized) return null
  if (normalized.startsWith('remote')) return 'Remote'
  if (normalized.startsWith('hybrid')) return 'Hybrid'
  return 'On-site'
}

const isIndiaLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return false
  return /^remote$/i.test(normalized) || INDIA_LOCATION_PATTERN.test(normalized)
}

const buildJobDescription = ({
  department,
  location,
  employmentType,
  compensation,
}) => [
  'Official Persevex opening listed on the first-party careers page.',
  department ? `Department: ${department}.` : null,
  location ? `Location: ${location}.` : null,
  employmentType ? `Work type: ${employmentType}.` : null,
  compensation ? `Compensation: ${compensation}.` : null,
]
  .filter(Boolean)
  .join(' ')

export const hasVerifiedCareersLink = (html) =>
  /href=["']\/careers["']/i.test(String(html ?? ''))

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)?.toLowerCase() || ''

  return /<title>\s*Persevex\s*\|\s*Persevex\s*<\/title>/i.test(page)
    && text.includes('campus ambassador')
    && text.includes('job clox')
    && text.includes('persevex lms')
    && hasVerifiedCareersLink(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)?.toLowerCase() || ''
  const rolesSection = stripTags(extractOpenRolesSection(page))?.toLowerCase() || ''

  return /<title>\s*Persevex\s*\|\s*Persevex\s*<\/title>/i.test(page)
    && text.includes('join the team')
    && text.includes('help students launch careers')
    && text.includes('build yours here')
    && rolesSection.includes('open positions')
    && rolesSection.includes('apply in under a minute')
    && rolesSection.includes("don't see your role")
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Persevex careers page no longer matches the verified public careers page')
  }

  const section = extractOpenRolesSection(html)
  const displayedRoleCount = extractDisplayedRoleCount(section)

  if (!Number.isFinite(displayedRoleCount) || displayedRoleCount <= 0) {
    throw new Error('Persevex careers page no longer exposes the verified public role count')
  }

  const jobs = [...section.matchAll(CARD_PATTERN)].map((match) => {
    const cardHtml = match[1]
    const badges = extractBadges(cardHtml)
    const metadata = extractMetadataValues(cardHtml)
    const title = stripTags(
      cardHtml.match(/<h3 class="text-lg font-bold text-foreground">([\s\S]*?)<\/h3>/i)?.[1] ?? null,
    )
    const employmentType = badges[0] || metadata[1] || null
    const department = badges[1] || null
    const rawLocation = metadata[0] || null
    const compensation = normalizeCompensation(metadata[2] || null)

    if (!title || !department || !rawLocation || !employmentType) {
      throw new Error('Persevex careers page no longer exposes verified public role cards')
    }

    if (metadata[1] && normalizeWhitespace(metadata[1]) !== normalizeWhitespace(employmentType)) {
      throw new Error('Persevex careers page no longer exposes verified public role cards')
    }

    if (!isIndiaLocation(rawLocation)) {
      throw new Error('Persevex careers page no longer exposes verified India role cards')
    }

    const location = normalizeIndiaLocation(rawLocation)
    const workplaceType = normalizeWorkplaceType(location)
    const jobId = slugify(SOURCE, title, department, location)

    return {
      title,
      company: COMPANY,
      department,
      location,
      city: extractCity(location),
      state: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      employmentType,
      workplaceType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: buildJobDescription({
        department,
        location,
        employmentType,
        compensation,
      }),
      remoteStatus: workplaceType,
    }
  })

  if (jobs.length === 0 || jobs.length !== displayedRoleCount) {
    throw new Error('Persevex careers page no longer exposes verified public role cards')
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createPersevexScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)

    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Persevex official homepage no longer matches the verified first-party surface')
    }

    if (!hasVerifiedCareersLink(homepageHtml)) {
      throw new Error('Persevex homepage no longer links to the verified careers page')
    }

    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Persevex careers page no longer matches the verified public careers page')
    }

    const jobs = extractPublicJobs(careersHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
      companyCareerPage: CAREERS_URL,
      companyDomain: 'persevex.com',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createPersevexScraper().run(options)

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
