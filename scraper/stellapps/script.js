import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { STELLAPPS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = STELLAPPS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_LANDING_URL = PROVIDER_METADATA.officialCareersPageUrl
export const JOB_OPENINGS_URL = PROVIDER_METADATA.jobOpeningsArchiveUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(value)

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toJobId = (title) => `stellapps-${slugify(title)}`

const toAbsoluteUrl = (value) => {
  try {
    return new URL(String(value ?? ''), JOB_OPENINGS_URL).href
  } catch {
    return null
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^part time$/i.test(normalized)) return 'Part time'
  return normalized.replace(/\b\w+/g, (token) => token[0].toUpperCase() + token.slice(1).toLowerCase())
}

const normalizeExperienceValue = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.replace(/\byears\b/i, 'Years')
}

const extractHeadingTexts = (html = '', tagName) =>
  [...String(html ?? '').matchAll(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi'))]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

const extractSectionListItems = (html = '', heading) => {
  const match = String(html ?? '').match(
    new RegExp(`<h2[^>]*>\\s*${heading}\\s*<\\/h2>\\s*<ul>([\\s\\S]*?)<\\/ul>`, 'i'),
  )
  if (!match?.[1]) return []

  return [...match[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((itemMatch) => stripTags(itemMatch[1]))
    .filter(Boolean)
}

const extractQualification = (html = '') => {
  const match = String(html ?? '').match(
    /<h2[^>]*>\s*Qualification\s*<\/h2>\s*<h3[^>]*>([\s\S]*?)<\/h3>/i,
  )

  return match?.[1] ? stripTags(match[1]) : null
}

const extractIntroText = (html = '', title) => {
  const escapedTitle = String(title ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(html ?? '').match(
    new RegExp(`<h2[^>]*>\\s*${escapedTitle}\\s*<\\/h2>\\s*<p>([\\s\\S]*?)<\\/p>`, 'i'),
  )

  return match?.[1] ? stripTags(match[1]) : null
}

const buildCompositeDescription = ({
  introText,
  minimumQualification,
  jobDescriptionItems,
  knowledgeItems,
  responsibilityItems,
}) => {
  const parts = []

  if (introText) parts.push(introText)
  if (minimumQualification) parts.push(`Qualification: ${minimumQualification}`)
  if (jobDescriptionItems.length > 0) {
    parts.push(`Job Description: ${jobDescriptionItems.join(' ')}`)
  }
  if (knowledgeItems.length > 0) {
    parts.push(`Knowledge: ${knowledgeItems.join(' ')}`)
  }
  if (responsibilityItems.length > 0) {
    parts.push(`Roles and Responsibilities: ${responsibilityItems.join(' ')}`)
  }

  return parts.join(' ') || null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialJobOpeningsSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return normalized.includes('Archives: Job Openings')
    && normalized.includes('Job Openings')
    && normalized.includes('About Stellapps')
  }

export const extractListingCards = (html = '') => {
  const cards = []
  const seenUrls = new Set()
  const page = String(html ?? '')

  for (const match of page.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const detailUrl = toAbsoluteUrl(match[1])
    const title = stripTags(match[2])
    if (!detailUrl || !title) continue

    let parsedUrl = null
    try {
      parsedUrl = new URL(detailUrl)
    } catch {
      continue
    }

    if (parsedUrl.hostname !== 'www.stellapps.com') continue
    const segments = parsedUrl.pathname.split('/').filter(Boolean)
    if (segments.length !== 2 || segments[0] !== 'jobopenings') continue
    if (/^page$/i.test(segments[1])) continue
    if (seenUrls.has(detailUrl)) continue

    seenUrls.add(detailUrl)
    cards.push({
      title,
      detailUrl,
    })
  }

  return cards
}

export const extractJobDetail = (html = '', detailUrl) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  if (!normalized.includes('About Stellapps') || !normalized.includes('APPLY')) {
    return null
  }

  const heading2Values = extractHeadingTexts(page, 'h2')
  const heading3Values = extractHeadingTexts(page, 'h3')
  const heading4Values = extractHeadingTexts(page, 'h4')
  const title = heading2Values[0] || null
  const experienceRequired = normalizeExperienceValue(heading3Values[0])
  const city = normalizeWhitespace(heading3Values[1])
  const employmentType = normalizeEmploymentType(heading4Values[0])

  if (!title || !experienceRequired || !city || !employmentType) {
    return null
  }

  const minimumQualification = extractQualification(page)
  const introText = extractIntroText(page, title)
  const jobDescriptionItems = extractSectionListItems(page, 'Job Description')
  const knowledgeItems = extractSectionListItems(page, 'Knowledge')
  const responsibilityItems = extractSectionListItems(page, 'Roles and Responsibilities')
  const jobDescription = buildCompositeDescription({
    introText,
    minimumQualification,
    jobDescriptionItems,
    knowledgeItems,
    responsibilityItems,
  })
  const location = `${city}, India`
  const remoteStatus = /\bremote\b/i.test(location) ? 'Remote' : 'On-site'

  if (!jobDescription) return null

  return {
    title,
    location,
    city,
    employmentType,
    experienceRequired,
    minimumQualification,
    jobDescription,
    jobId: toJobId(title),
    remoteStatus,
    detailUrl,
  }
}

export const createStellappsScraper = ({
  now = () => new Date().toISOString(),
  maxJobs = null,
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const archiveHtml = await fetchText(JOB_OPENINGS_URL)

    if (!hasOfficialJobOpeningsSignal(archiveHtml)) {
      throw new Error('Stellapps verified job openings archive no longer matches the trusted first-party surface')
    }

    const listingCards = extractListingCards(archiveHtml)
    if (listingCards.length === 0) {
      throw new Error('Stellapps verified archive exposes no public job detail links')
    }

    const jobs = []

    for (const card of listingCards) {
      const detailHtml = await fetchText(card.detailUrl)
      const detail = extractJobDetail(detailHtml, card.detailUrl)

      if (!detail || detail.title !== card.title) {
        throw new Error('Stellapps verified first-party job detail page no longer matches the trusted surface')
      }

      jobs.push({
        title: detail.title,
        company: COMPANY_NAME,
        department: null,
        location: detail.location,
        city: detail.city,
        state: null,
        country: 'India',
        jobId: detail.jobId,
        requisitionId: null,
        sourceUrl: detail.detailUrl,
        applyUrl: detail.detailUrl,
        employmentType: detail.employmentType,
        experienceRequired: detail.experienceRequired,
        minimumQualification: detail.minimumQualification,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: detail.jobDescription,
        remoteStatus: detail.remoteStatus,
        source: SOURCE,
        link: detail.detailUrl,
        scrapedAt: now(),
      })
    }

    return Number.isFinite(maxJobs) ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createStellappsScraper(options).run(options)

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
