import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const BASE_URL = 'https://www.suntecgroup.com'
export const CAREERS_URL = `${BASE_URL}/career/`

const SOURCE = 'suntec'
const COMPANY = 'SunTec Group'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INLINE_LISTING_LOOKBACK_CHARS = 3500

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/section|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractDocumentTitle = (html) => normalizeWhitespace(
  String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '',
)

const toAbsoluteUrl = (value) => {
  if (!value) return null

  try {
    const parsed = new URL(decodeHtmlEntities(value), BASE_URL)
    if (parsed.hostname === 'suntecgroup.com') {
      parsed.hostname = 'www.suntecgroup.com'
    }
    return parsed.toString()
  } catch {
    return null
  }
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || null

const slugFromUrl = (url) => {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] || null
  } catch {
    return null
  }
}

const isDetailUrl = (url) => {
  if (!url) return false

  try {
    const parsed = new URL(url)
    return /(^|\.)suntecgroup\.com$/i.test(parsed.hostname)
      && /^\/careers\/[^/]+\/?$/i.test(parsed.pathname)
  } catch {
    return false
  }
}

const getTextLines = (html) => [...String(html ?? '').matchAll(/<(?:p|li|h1|h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:p|li|h1|h2|h3|h4)>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

const extractHeadingContext = (html) => {
  const matches = [...String(html ?? '').matchAll(/<(h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi)]

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index]
    const title = normalizeWhitespace(match[2])

    if (!title) continue
    if (/^current openings$/i.test(title)) continue
    if (/^careers$/i.test(title)) continue
    if (/^join our team/i.test(title)) continue
    if (/^let[’']?s transform your business together!?$/i.test(title)) continue

    return {
      title,
      endIndex: (match.index ?? 0) + match[0].length,
    }
  }

  return null
}

const extractInlineDescription = (html) => {
  const paragraphs = [...String(html ?? '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)
    .filter((text) => !/If you're exploring opportunities beyond the current listings/i.test(text))

  return paragraphs.join(' ') || null
}

const isHiddenEverywhereSegment = (html) => {
  const segment = String(html ?? '')
  return /elementor-hidden-desktop/i.test(segment)
    && /elementor-hidden-tablet/i.test(segment)
    && /elementor-hidden-mobile/i.test(segment)
}

const extractFieldFromLines = (lines, label) => {
  const matcher = new RegExp(`^${label}\\s*:\\s*(.+)$`, 'i')

  for (const line of lines) {
    const match = matcher.exec(line)
    if (match) return normalizeWhitespace(match[1])
  }

  return null
}

const extractDescription = (html) => {
  const sectionMatch = String(html ?? '').match(
    /<(section|div)[^>]*class=["'][^"']*elementor-widget-theme-post-content[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i,
  )

  return stripTags(sectionMatch?.[2]) || null
}

const inferRemoteStatus = (location) => {
  if (/hybrid/i.test(location || '')) return 'Hybrid'
  if (/remote|work from home/i.test(location || '')) return 'Remote'
  return 'On-site'
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /SunTec Group/i.test(page)
    && /Work with us - SunTec|Career/i.test(page)
    && /Current Openings/i.test(page)
    && /(Gravity Forms|gform_wrapper|elementor)/i.test(page)
    && /View Openings/i.test(page)
}

export const extractListings = (html) => {
  const jobs = []
  const seen = new Set()

  for (const match of String(html ?? '').matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const anchorText = normalizeWhitespace(match[2])
    if (!/view openings/i.test(anchorText || '')) continue

    const detailUrl = toAbsoluteUrl(match[1])
    if (!detailUrl) continue

    const anchorIndex = match.index ?? 0
    const contextStart = Math.max(0, anchorIndex - INLINE_LISTING_LOOKBACK_CHARS)
    const context = String(html ?? '').slice(contextStart, anchorIndex)
    if (isHiddenEverywhereSegment(context)) continue

    const headingContext = extractHeadingContext(context)
    if (!headingContext?.title) continue

    const title = headingContext.title
    const inlineDescription = extractInlineDescription(context.slice(headingContext.endIndex))
    const jobId = slugFromUrl(detailUrl) || slugify(title)
    const canonicalSourceUrl = isDetailUrl(detailUrl) ? detailUrl : CAREERS_URL
    const dedupeKey = `${title.toLowerCase()}::${jobId}`

    if (!jobId || seen.has(dedupeKey)) continue

    seen.add(dedupeKey)
    jobs.push({
      title,
      company: COMPANY,
      jobId,
      requisitionId: jobId,
      sourceUrl: canonicalSourceUrl,
      applyUrl: canonicalSourceUrl,
      detailUrl: isDetailUrl(detailUrl) ? detailUrl : null,
      inlineDescription,
    })
  }

  return jobs
}

export const extractJobDetail = (html, listing = {}) => {
  const lines = getTextLines(html)
  const pageTitle = extractDocumentTitle(html)
  const title = normalizeWhitespace(
    pageTitle ? pageTitle.replace(/\s*-\s*SunTec Group\s*$/i, '') : '',
  ) || listing.title || null
  const department = extractFieldFromLines(lines, 'Department')
  const location = normalizeWhitespace(
    String(html ?? '').match(/<h2[^>]*>\s*(?:<b>\s*)?Location:\s*(?:<\/b>\s*)?([^<]+)<\/h2>/i)?.[1],
  ) || extractFieldFromLines(lines, 'Location')
  const experienceRequired = normalizeWhitespace(
    String(html ?? '').match(/<p[^>]*>\s*Experience:\s*([^<]+)<\/p>/i)?.[1],
  ) || extractFieldFromLines(lines, 'Experience')
  const city = normalizeWhitespace(location)?.split(',')[0] || null
  const country = /india/i.test(location || '') || location ? 'India' : null

  return {
    title,
    company: COMPANY,
    department,
    location,
    city,
    country,
    jobId: listing.jobId || slugFromUrl(listing.sourceUrl) || null,
    requisitionId: listing.requisitionId || listing.jobId || slugFromUrl(listing.sourceUrl) || null,
    sourceUrl: listing.sourceUrl || null,
    applyUrl: listing.sourceUrl || listing.applyUrl || null,
    employmentType: null,
    experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: extractDescription(html) || listing.inlineDescription || null,
    remoteStatus: inferRemoteStatus(location),
  }
}

const buildInlineFallbackJob = (listing = {}) => ({
  title: listing.title || null,
  company: COMPANY,
  department: null,
  location: null,
  city: null,
  country: 'India',
  jobId: listing.jobId || slugify(listing.title) || null,
  requisitionId: listing.requisitionId || listing.jobId || slugify(listing.title) || null,
  sourceUrl: CAREERS_URL,
  applyUrl: CAREERS_URL,
  employmentType: null,
  experienceRequired: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: null,
  closingDate: null,
  jobDescription: listing.inlineDescription || null,
  remoteStatus: 'On-site',
})

const isHttp404Error = (error) => /HTTP 404\b/i.test(String(error?.message ?? error ?? ''))

const defaultFetchText = (url, { attempts = 3 } = {}) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
  attempts,
})

export const createSuntecScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('verified SunTec careers surface no longer matches the official public careers page')
    }

    const listings = extractListings(careersHtml)
    const selectedListings = maxJobs ? listings.slice(0, maxJobs) : listings
    const jobs = []

    for (const listing of selectedListings) {
      if (!listing.detailUrl) {
        jobs.push({
          ...buildInlineFallbackJob(listing),
          source: SOURCE,
          link: CAREERS_URL,
          scrapedAt: now(),
        })
        continue
      }

      try {
        const detailHtml = await fetchText(listing.detailUrl, { attempts: 1 })
        jobs.push({
          ...extractJobDetail(detailHtml, {
            ...listing,
            sourceUrl: listing.detailUrl,
            applyUrl: listing.detailUrl,
          }),
          source: SOURCE,
          link: listing.detailUrl,
          scrapedAt: now(),
        })
      } catch (error) {
        if (!isHttp404Error(error)) {
          throw error
        }

        jobs.push({
          ...buildInlineFallbackJob(listing),
          source: SOURCE,
          link: CAREERS_URL,
          scrapedAt: now(),
        })
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createSuntecScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running SunTec scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)

  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
