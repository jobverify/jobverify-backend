import { fetchTextWithRetry } from '../utils/fetch.js'

import { NORWIN_TECHNOLOGIES_CATALOG } from './catalog.js'

export const SOURCE = NORWIN_TECHNOLOGIES_CATALOG.source
export const COMPANY_NAME = NORWIN_TECHNOLOGIES_CATALOG.companyName
export const CAREERS_URL = NORWIN_TECHNOLOGIES_CATALOG.companyCareerPage
export const BOARD_URL = NORWIN_TECHNOLOGIES_CATALOG.officialJobsBoardUrl

const BOARD_ORIGIN = new URL(BOARD_URL).origin
const JOB_PATH_PATTERN = /^\/jobs\/([a-z0-9-]+)\/?$/i

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeText = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?\s*>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim() || null

const getVerifiedJobUrl = (value) => {
  try {
    const url = new URL(value, BOARD_URL)
    const match = url.pathname.match(JOB_PATH_PATTERN)
    if (url.origin !== BOARD_ORIGIN || !match) return null

    url.search = ''
    url.hash = ''
    return { url: url.toString(), jobId: match[1] }
  } catch {
    return null
  }
}

const extractCity = (location) => normalizeText(location)?.split(',')[0]?.trim() || null

const extractLocationFromContext = (html, startIndex) => {
  const afterLink = String(html ?? '').slice(startIndex)
  const blockMatch = afterLink.match(/<(div|p|span)\b[^>]*>([\s\S]*?)<\/\1>/i)
  if (blockMatch) return normalizeText(blockMatch[2])

  const normalized = normalizeText(afterLink)
  if (!normalized) return null

  const exactMatch = normalized.match(/[A-Za-z][A-Za-z\s.-]+,\s*[A-Za-z][A-Za-z\s.-]+,\s*(?:India|United States)/i)
  if (exactMatch) return exactMatch[0]

  const shortMatch = normalized.match(/[A-Za-z][A-Za-z\s.-]+,\s*(?:India|United States)/i)
  return shortMatch?.[0] || null
}

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeText(html) || ''
  return normalized.includes('Join the Elite Technical Bench.')
    && normalized.includes('Not Just a Job. A Technical Career Built to Last.')
    && normalized.includes('Great Place To Work, India')
}

export const extractTrakstarListings = (html = '') => {
  const page = String(html ?? '')
  const listings = []

  for (const match of page.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const detail = getVerifiedJobUrl(match[1])
    const title = normalizeText(match[2])
    if (!detail || !title) continue

    const location = extractLocationFromContext(page, match.index + match[0].length)
    if (!location) continue

    listings.push({
      title,
      location,
      city: extractCity(location),
      sourceUrl: detail.url,
      applyUrl: detail.url,
      link: detail.url,
      jobId: detail.jobId,
      requisitionId: detail.jobId,
    })
  }

  return [...new Map(listings.map((listing) => [listing.sourceUrl, listing])).values()]
}

export const hasVerifiedTrakstarBoardSignal = (html = '') => {
  const page = String(html ?? '')
  return /Norwin Technologies/i.test(page)
    && /Jobs at Norwin Technologies/i.test(page)
    && extractTrakstarListings(page).length > 0
}

const extractLabeledField = (html, label) => normalizeText(
  String(html ?? '').match(new RegExp(`${label}\\s*:\\s*([^<\\n]+)`, 'i'))?.[1],
)

const extractDetail = (html, listing) => {
  const page = String(html ?? '')
  const descriptionMatch = page.match(/<(section|div)[^>]*class=["'][^"']*job-description[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i)
  const description = normalizeText(descriptionMatch?.[2])
  const location = extractLabeledField(page, 'Location') || listing.location

  return {
    isVerified: new RegExp(escapeRegExp(listing.title), 'i').test(page) && /Job Description/i.test(page),
    department: extractLabeledField(page, 'Department'),
    location,
    city: extractCity(location),
    jobDescription: description,
  }
}

const escapeRegExp = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createNorwinTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Norwin Technologies verified careers page no longer matches the pinned first-party surface')
    }

    const boardHtml = await fetchText(BOARD_URL)
    if (!hasVerifiedTrakstarBoardSignal(boardHtml)) {
      throw new Error('Norwin Technologies verified Trakstar board no longer matches the pinned public jobs surface')
    }

    const jobs = []
    for (const listing of extractTrakstarListings(boardHtml)) {
      if (!/India/i.test(listing.location)) continue

      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractDetail(detailHtml, listing)
      if (!detail.isVerified) continue

      jobs.push({
        ...listing,
        company: COMPANY_NAME,
        department: detail.department || null,
        location: detail.location || listing.location,
        city: detail.city || listing.city,
        country: 'India',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: detail.jobDescription,
        remoteStatus: null,
        source: SOURCE,
        link: listing.link,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createNorwinTechnologiesScraper().run(options)
