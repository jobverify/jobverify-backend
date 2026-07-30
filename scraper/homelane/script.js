import path from 'node:path'
import { fileURLToPath } from 'node:url'

import HOMELANE_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = HOMELANE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const ROOT_URL = 'https://sentinel.homelane.com/'
export const JOBS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&#x2013;|&#8211;/gi, '-')
  .replace(/&#x20b9;|&#8377;/gi, '₹')

const stripTags = (value) => decodeHtmlEntities(
  String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeWhitespace = (value) => {
  const normalized = stripTags(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toAbsoluteUrl = (value, baseUrl = ROOT_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeExperience = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const match = normalized.match(/(\d+)\s*-\s*(\d+)\s+years?/i)
  if (!match) return normalized

  return `${match[1]}-${match[2]} years`
}

const normalizeSalary = (value) => normalizeWhitespace(value)?.replace(/\s*-\s*/g, ' - ') || null

const normalizeOpenings = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  const match = normalized.match(/(\d+)\s+openings?/i)
  return match ? `${match[1]} opening${match[1] === '1' ? '' : 's'}` : normalized
}

const extractSpanTexts = (html = '') => [...String(html ?? '').matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

const looksLikeMetadataSummary = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  return normalized.includes('years exp') && normalized.includes('opening')
}

const extractLocationParts = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return { location: null, city: null, state: null }
  }

  const [city, state] = normalized.split(',').map((part) => part.trim())
  return {
    location: normalized,
    city: city || null,
    state: state || null,
  }
}

export const hasTrustedJobsIndexSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return normalized.includes('homelane')
    && normalized.includes('currently open')
    && normalized.includes('actively hiring')
    && /href="\/jobs\/HL_\d+"/i.test(page)
}

export const extractRoleCount = (html = '') => {
  const page = String(html ?? '')
  const explicitMatch = page.match(/>\s*(\d+)\s*(?:<!--\s*-->)*\s*role(?:<!--\s*-->)*s?\s*currently open/i)
  if (explicitMatch) return Number.parseInt(explicitMatch[1], 10)

  const fallbackMatch = normalizeWhitespace(page)?.match(/(\d+)\s+roles?\s+currently\s+open/i)
  return fallbackMatch ? Number.parseInt(fallbackMatch[1], 10) : null
}

export const extractJobCards = (html = '') => {
  const page = String(html ?? '')
  const cards = []
  const cardPattern = /<a[^>]+href="(\/jobs\/HL_\d+)"[^>]*>([\s\S]*?)<\/a>/gi

  for (const match of page.matchAll(cardPattern)) {
    const detailPath = match[1]
    const cardHtml = match[2]
    const title = normalizeWhitespace(cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const spanTexts = extractSpanTexts(cardHtml)
    const locationText = normalizeWhitespace(
      cardHtml.match(/lucide-map-pin[\s\S]*?<\/svg>([\s\S]*?)<\/span>/i)?.[1],
    ) || spanTexts.find((value) => /,\s*/.test(value))
    const experienceText = normalizeExperience(
      cardHtml.match(/lucide-clock[\s\S]*?<\/svg>([\s\S]*?)<\/span>/i)?.[1],
    ) || normalizeExperience(spanTexts.find((value) => /\byears?\b/i.test(value)))
    const openingsText = normalizeOpenings(
      cardHtml.match(/lucide-users[\s\S]*?<\/svg>([\s\S]*?)<\/span>/i)?.[1],
    ) || normalizeOpenings(spanTexts.find((value) => /\bopening/i.test(value)))
    const salary = normalizeSalary(
      cardHtml.match(/<div class="text-sm font-semibold text-gray-800">([\s\S]*?)<\/div>/i)?.[1],
    ) || normalizeSalary(cardHtml.match(/<div[^>]*>([\s\S]*?₹[\s\S]*?p\.a\.)<\/div>/i)?.[1])
    const summaryText = normalizeWhitespace(
      cardHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
    )
    const { location, city, state } = extractLocationParts(locationText)

    if (!title || !location) continue

    cards.push({
      title,
      detailPath,
      detailUrl: toAbsoluteUrl(detailPath),
      location,
      city,
      state,
      experienceRequired: experienceText,
      openingsText,
      salary,
      summary: summaryText === '.' || looksLikeMetadataSummary(summaryText) ? null : summaryText,
    })
  }

  return cards
}

export const extractDetailFields = (html = '', detailUrl = null) => {
  const page = String(html ?? '')
  const spanTexts = extractSpanTexts(page)
  const locationText = normalizeWhitespace(
    page.match(/lucide-map-pin[\s\S]*?<\/svg>([\s\S]*?)<\/span>/i)?.[1],
  ) || spanTexts.find((value) => /,\s*/.test(value))
  const applyPath = page.match(/href="(\/apply\/HL_\d+)"/i)?.[1] ?? null
  const description = normalizeWhitespace(
    page.match(/<h2[^>]*>\s*About the Role\s*<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
  )
  const salary = normalizeSalary(
    page.match(/<div class="text-lg font-bold text-gray-900">([\s\S]*?)<\/div>/i)?.[1],
  ) || normalizeSalary(page.match(/<div[^>]*>([\s\S]*?₹[\s\S]*?p\.a\.)<\/div>/i)?.[1])
  const experienceRequired = normalizeExperience(
    page.match(/lucide-clock[\s\S]*?<\/svg>([\s\S]*?)<\/span>/i)?.[1],
  ) || normalizeExperience(spanTexts.find((value) => /\byears?\b/i.test(value)))

  return {
    applyUrl: toAbsoluteUrl(applyPath, detailUrl || ROOT_URL),
    description: description === '.' ? null : description,
    salary,
    location: locationText,
    experienceRequired,
  }
}

const defaultFetchText = async (url, { signal } = {}) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createHomeLaneScraper = ({ fetchText = defaultFetchText } = {}) => ({
  async run({ fetchText: overrideFetchText, signal } = {}) {
    const fetchImpl = overrideFetchText || fetchText
    const indexHtml = await fetchImpl(JOBS_URL, { signal })

    if (!hasTrustedJobsIndexSignal(indexHtml)) {
      throw new Error('HomeLane verified first-party jobs index no longer matches the trusted public surface')
    }

    const cards = extractJobCards(indexHtml)
    const roleCount = extractRoleCount(indexHtml)
    if (cards.length === 0 || (roleCount != null && roleCount < cards.length)) {
      throw new Error('HomeLane verified first-party jobs index changed materially or no longer exposes the trusted role inventory')
    }

    const jobs = []
    for (const card of cards) {
      const detailHtml = await fetchImpl(card.detailUrl, { signal })
      const detail = extractDetailFields(detailHtml, card.detailUrl)
      const finalLocation = detail.location || card.location
      const finalLocationParts = extractLocationParts(finalLocation)

      jobs.push({
        title: card.title,
        company: COMPANY,
        source: SOURCE,
        link: card.detailUrl,
        sourceUrl: card.detailUrl,
        applyUrl: detail.applyUrl || card.detailUrl,
        location: finalLocation || card.location,
        city: finalLocationParts.city || card.city,
        state: finalLocationParts.state || card.state,
        country: 'India',
        experienceRequired: detail.experienceRequired || card.experienceRequired,
        salary: detail.salary || card.salary,
        openingsText: card.openingsText,
        jobDescription: detail.description || card.summary,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
        companyCareerPage: JOBS_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        scrapedAt: new Date().toISOString(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createHomeLaneScraper().run(options)

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
