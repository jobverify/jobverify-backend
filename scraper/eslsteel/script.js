import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { ESL_STEEL_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = ESL_STEEL_CATALOG.source
export const COMPANY = ESL_STEEL_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = ESL_STEEL_CATALOG.officialBrandName
export const VERIFIED_ON = ESL_STEEL_CATALOG.verifiedOn
export const HOMEPAGE_URL = ESL_STEEL_CATALOG.officialHomepageUrl
export const CAREER_LANDING_URL = ESL_STEEL_CATALOG.officialCareerLandingUrl
export const JOBS_ARCHIVE_URL = ESL_STEEL_CATALOG.officialJobsArchiveUrl
export const PROVIDER_METADATA = ESL_STEEL_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&#8216;|&#8217;|&rsquo;|&apos;|&#39;/gi, "'")
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&bull;/gi, '•')
  .replace(/&hellip;/gi, '...')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/[\u2013\u2014]/g, '-')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const htmlToLines = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>/gi, '\n')
  .replace(/<(p|div|h[1-6]|li)\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const normalizeTextBlock = (value) => normalizeWhitespace(htmlToLines(value).join(' '))

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const toAbsoluteUrl = (value, baseUrl = HOMEPAGE_URL) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value).trim(), baseUrl).toString()
  } catch {
    return null
  }
}

const extractSlugFromUrl = (url) => {
  try {
    const { pathname } = new URL(String(url ?? ''))
    return pathname
      .split('/')
      .filter(Boolean)
      .pop() || null
  } catch {
    return null
  }
}

const parseLocation = (value) => {
  const normalized = normalizeWhitespace(value)

  if (!normalized) {
    return {
      location: null,
      city: null,
      state: null,
      country: null,
    }
  }

  const parts = normalized
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  const city = parts[0] || null
  const state = parts.length > 1 ? parts[1] : null

  return {
    location: state ? `${city}, ${state}, India` : `${city}, India`,
    city,
    state,
    country: 'India',
  }
}

const extractLabeledValue = (lines, label) => {
  for (const line of lines) {
    const match = line.match(new RegExp(`^${label}\\s*:?\\s*(.+)$`, 'i'))
    if (match?.[1]) {
      return normalizeWhitespace(match[1])
    }
  }

  return null
}

const defaultFetchPage = async (url) => ({
  status: 200,
  url,
  html: await fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  }),
})

export const buildJobDetailUrl = (slug) => `${JOBS_ARCHIVE_URL}${normalizeWhitespace(slug) || ''}/`

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*ESL Steel Plant in Bokaro, Jharkhand \| Steel Manufacturing Company\s*<\/title>/i.test(page)
    && /ABOUT ESL STEEL LIMITED/i.test(page)
    && /ESL Steel Limited is a greenfield, integrated steel plant in the Bokaro district of Jharkhand/i.test(normalized)
    && /href=["']https:\/\/www\.eslsteel\.com\/career\/["']/i.test(page)
}

export const hasJobsArchiveSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Jobs Archive - Esl\s*<\/title>/i.test(page)
    && /sjb-archive-page/i.test(page)
    && /job-title/i.test(page)
    && /Read More/i.test(page)
    && /https:\/\/www\.eslsteel\.com\/jobs\/[^/"']+\/?/i.test(page)
}

export const hasJobDetailSignal = (html) => {
  const page = String(html ?? '')

  return /<title>[\s\S]+ - Esl<\/title>/i.test(page)
    && /class="job-title"/i.test(page)
    && /Apply For This Job/i.test(page)
    && /jobapp_name/i.test(page)
    && /jobapp_years_of_exp/i.test(page)
    && /applicant-resume/i.test(page)
    && /process_applicant_form/i.test(page)
}

export const extractJobCards = (html) => {
  const seen = new Set()
  const cards = []

  for (const match of String(html ?? '').matchAll(
    /<h4>\s*<a href="([^"]+)">\s*<span class="job-title">([\s\S]*?)<\/span>\s*<\/a>\s*<\/h4>/gi,
  )) {
    const sourceUrl = toAbsoluteUrl(match[1], JOBS_ARCHIVE_URL)
    const title = normalizeWhitespace(match[2])
    const slug = extractSlugFromUrl(sourceUrl)

    if (!sourceUrl || !title || !slug || seen.has(slug)) continue

    seen.add(slug)
    cards.push({
      slug,
      title,
      sourceUrl,
    })
  }

  return cards
}

export const extractJobDetail = (html, card = {}, scrapedAt) => {
  const detailHtml = String(html ?? '')
  const title = normalizeWhitespace(
    extractFirst(/<span class="job-title">([\s\S]*?)<\/span>/i, detailHtml),
  )
  const detailSection = extractFirst(
    /<div class="job-detail">[\s\S]*?<\/div>([\s\S]*?)<h3>\s*Apply For This Job\s*<\/h3>/i,
    detailHtml,
  )
  const lines = htmlToLines(detailSection)
    .filter((line) => !/^Posted\s+\d+\s+\w+\s+ago$/i.test(line))
  const detailTitle = title || card.title || null
  const jobId = normalizeWhitespace(
    extractFirst(/name="job_id"\s+value="([^"]+)"/i, detailHtml),
  ) || card.slug
  const locationBits = parseLocation(extractLabeledValue(lines, 'Location'))

  if (!detailTitle || !detailSection || !jobId || !card.sourceUrl) {
    throw new Error('ESL Steel verified first-party job detail no longer exposes the expected fields')
  }

  if (card.title && detailTitle.toLowerCase() !== card.title.toLowerCase()) {
    throw new Error('ESL Steel verified first-party archive and detail titles no longer match')
  }

  return {
    jobId,
    requisitionId: card.slug || jobId,
    title: detailTitle,
    company: COMPANY,
    department: null,
    location: locationBits.location,
    city: locationBits.city,
    state: locationBits.state,
    country: locationBits.country,
    sourceUrl: card.sourceUrl,
    applyUrl: card.sourceUrl,
    employmentType: null,
    experienceRequired: extractLabeledValue(lines, 'Experience'),
    minimumQualification: extractLabeledValue(lines, 'Qualification'),
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: normalizeTextBlock(detailSection),
    source: SOURCE,
    link: card.sourceUrl,
    scrapedAt,
  }
}

export const createEslSteelScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('ESL Steel verified official homepage changed materially')
    }

    const jobsArchive = await fetchPage(JOBS_ARCHIVE_URL)
    if (jobsArchive.status !== 200 || !hasJobsArchiveSignal(jobsArchive.html)) {
      throw new Error('ESL Steel verified first-party jobs archive changed materially')
    }

    const cards = extractJobCards(jobsArchive.html)
    if (cards.length === 0) {
      throw new Error('ESL Steel verified first-party jobs archive no longer exposes job cards')
    }

    const jobs = []

    for (const card of cards) {
      const detailPage = await fetchPage(card.sourceUrl)

      if (detailPage.status !== 200 || !hasJobDetailSignal(detailPage.html)) {
        throw new Error('ESL Steel verified first-party job detail changed materially')
      }

      jobs.push(extractJobDetail(detailPage.html, card, now()))

      if (maxJobs && jobs.length >= maxJobs) {
        break
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createEslSteelScraper(options).run(options)

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
