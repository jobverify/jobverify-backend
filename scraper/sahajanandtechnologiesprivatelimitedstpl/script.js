import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const CAREERS_URL = 'https://www.sltl.com/current-openings/'
export const APPLY_URL = 'https://www.sltl.com/contact-us/#contactTab5'
export const COMPANY_NAME = 'Sahajanand Laser Technology Ltd. (SLTL Group)'

const OFFICIAL_CAREERS_TITLE_PATTERN = /<title>\s*Current Openings\s*\|\s*\(SLTL\)\s*Sahajanand Laser Technology Ltd\s*<\/title>/i
const OFFICIAL_CAREERS_CANONICAL_PATTERN = /<link[^>]+rel="canonical"[^>]+href="https:\/\/www\.sltl\.com\/current-openings\/"/i
const OFFICIAL_CAREERS_SITE_PATTERN = /SLTL Group(?:&reg;|®)/i
const OFFICIAL_DETAIL_CANONICAL_PATTERN = /<link[^>]+rel="canonical"[^>]+href="https:\/\/www\.sltl\.com\/careers\/[^"]+\/"/i
const OFFICIAL_DETAIL_TITLE_PATTERN = /<title>[^<]+- SLTL Group(?:&reg;|®)<\/title>/i

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'sahajanandtechnologiesprivatelimitedstpl',
  timeoutMs: 15000,
})

const HTML_ENTITY_MAP = new Map([
  ['amp', '&'],
  ['apos', "'"],
  ['nbsp', ' '],
  ['quot', '"'],
  ['reg', '®'],
  ['ldquo', '"'],
  ['rdquo', '"'],
  ['lsquo', "'"],
  ['rsquo', "'"],
  ['hellip', '...'],
])

const decodeHtmlEntities = (value) => String(value ?? '').replace(
  /&(#x?[0-9a-f]+|[a-z]+);/gi,
  (_, entity) => {
    const normalized = entity.toLowerCase()

    if (normalized.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16))
    }

    if (normalized.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10))
    }

    return HTML_ENTITY_MAP.get(normalized) ?? `&${entity};`
  },
)

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(value)
const collapseLines = (value) => normalizeWhitespace(value)?.replace(/\n+/g, ' ')?.trim() ?? null

const toAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const extractLabeledValues = (html) => {
  const values = {}

  for (const match of String(html ?? '').matchAll(/<p class="opening-text d-flex">[\s\S]*?<strong class="label">([^<]+)<\/strong>[\s\S]*?<span class="value">([\s\S]*?)<\/span>[\s\S]*?<\/p>/gi)) {
    const label = normalizeWhitespace(match[1])?.replace(/:$/, '')
    const value = stripTags(match[2])

    if (label && value) {
      values[label] = value
    }
  }

  return values
}

const extractCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0])

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return OFFICIAL_CAREERS_TITLE_PATTERN.test(page)
    && OFFICIAL_CAREERS_CANONICAL_PATTERN.test(page)
    && OFFICIAL_CAREERS_SITE_PATTERN.test(page)
}

const hasOfficialDetailSignal = (html) => {
  const page = String(html ?? '')

  return OFFICIAL_DETAIL_CANONICAL_PATTERN.test(page)
    && OFFICIAL_DETAIL_TITLE_PATTERN.test(page)
    && OFFICIAL_CAREERS_SITE_PATTERN.test(page)
  }

export const extractJobCards = (html) => {
  const cards = []
  const matches = String(html ?? '').matchAll(/<div class="items"[\s\S]*?<div class="left-block">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi)

  for (const match of matches) {
    const block = match[1]
    const titleMatch = block.match(/<h3 class="career-tl"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h3>/i)

    if (!titleMatch) {
      continue
    }

    const sourceUrl = toAbsoluteUrl(titleMatch[1])
    const title = stripTags(titleMatch[2])
    const values = extractLabeledValues(block)

    if (!sourceUrl || !title || !values.Location) {
      continue
    }

    cards.push({
      title,
      sourceUrl,
      designation: values.Designation ?? null,
      location: values.Location,
      reportingManager: values['Reporting Manager'] ?? null,
      products: values.Products ?? null,
      minimumQualification: values['Edu. Qualification'] ?? null,
      experienceRequired: values.Experience ?? null,
    })
  }

  return cards
}

export const extractJobDetail = (html) => {
  if (!hasOfficialDetailSignal(html)) {
    throw new Error('SLTL job detail surface changed; refusing to parse speculative data')
  }

  const topBlockMatch = String(html ?? '').match(/<div class="career-top-block[\s\S]*?<div class="left-block">([\s\S]*?)<\/div>\s*<\/div>/i)
  const contentMatch = String(html ?? '').match(/<div class="career-content entry-content[^"]*">([\s\S]*?)<\/div>/i)
  const applyMatch = String(html ?? '').match(/<a class="btn secondary small btn-arrow" href="([^"]+)" title="Apply Now">/i)
  const titleMatch = String(html ?? '').match(/<h2 class="career-tl">([\s\S]*?)<\/h2>/i)

  if (!topBlockMatch || !contentMatch || !titleMatch) {
    throw new Error('SLTL job detail page no longer exposes the expected detail blocks')
  }

  const values = extractLabeledValues(topBlockMatch[1])

  return {
    title: stripTags(titleMatch[1]),
    designation: values.Designation ?? null,
    location: values.Location ?? null,
    minimumQualification: values['Edu. Qualification'] ?? null,
    experienceRequired: values.Experience ?? null,
    jobDescription: collapseLines(contentMatch[1]),
    applyUrl: toAbsoluteUrl(applyMatch?.[1]) ?? APPLY_URL,
  }
}

export const createSahajanandTechnologiesPrivateLimitedStplScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('SLTL current openings surface changed; refusing to scrape unverified data')
    }

    const cards = extractJobCards(careersHtml)

    if (cards.length === 0) {
      throw new Error('SLTL current openings page no longer exposes job cards; refusing to assume there are no openings')
    }

    const jobs = []

    for (const card of cards) {
      const detailHtml = await fetchText(card.sourceUrl)
      const detail = extractJobDetail(detailHtml)

      jobs.push({
        title: detail.title ?? card.title,
        company: COMPANY_NAME,
        department: null,
        location: detail.location ?? card.location,
        city: extractCity(detail.location ?? card.location),
        country: 'India',
        jobId: card.sourceUrl,
        requisitionId: card.sourceUrl,
        sourceUrl: card.sourceUrl,
        applyUrl: detail.applyUrl ?? APPLY_URL,
        employmentType: null,
        experienceRequired: detail.experienceRequired ?? card.experienceRequired,
        minimumQualification: detail.minimumQualification ?? card.minimumQualification,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: detail.jobDescription,
        remoteStatus: null,
        source: 'sahajanandtechnologiesprivatelimitedstpl',
        link: detail.applyUrl ?? APPLY_URL,
        scrapedAt: new Date().toISOString(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) =>
  createSahajanandTechnologiesPrivateLimitedStplScraper().run(options)
