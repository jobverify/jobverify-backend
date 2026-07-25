import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://www.texmo.com/careers/'
export const CAREER_DETAILS_URL = 'https://www.texmo.com/career-details/'
export const SOURCE = 'texmoindustries'
export const COMPANY_NAME = 'Texmo Industries'
export const COMPANY_FILTER_VALUE = '1489'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&#8217;|&apos;|&rsquo;/gi, "'")
  .replace(/&#8211;/gi, '–')
  .replace(/&#8212;/gi, '—')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeDetailPath = (href) => normalizeWhitespace(href)?.replace(
  /^\/career-details(?=\?)/i,
  '/career-details/',
)

const toIsoClosingDate = (value) => {
  const match = normalizeWhitespace(value)?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

const extractSectionMatch = (html, pattern) => {
  const match = String(html ?? '').match(pattern)
  return match ? match[1] : null
}

export const extractOfficialCompanyFilterValue = (html) =>
  normalizeWhitespace(extractSectionMatch(
    html,
    /<option[^>]+value=['"]([^'"]+)['"][^>]*>\s*Texmo Industries\s*<\/option>/i,
  ))

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  return /<form[^>]+id=["']jobForm["']/i.test(page)
    && /Latest Careers/i.test(page)
    && /<select[^>]+name=["']company["']/i.test(page)
    && /<select[^>]+name=["']role["']/i.test(page)
    && extractOfficialCompanyFilterValue(page) === COMPANY_FILTER_VALUE
}

const hasOfficialCareersShellSignal = (html) => {
  const page = String(html ?? '')
  return /<form[^>]+id=["']jobForm["']/i.test(page)
    && /Latest Careers/i.test(page)
    && /<select[^>]+name=["']company["']/i.test(page)
    && /<select[^>]+name=["']role["']/i.test(page)
}

export const buildCompanyPageRequestBody = ({ page = 1 } = {}) => {
  const body = new URLSearchParams({ company: COMPANY_FILTER_VALUE })
  if (page > 1) {
    body.set('pageNumber', String(page))
  }
  return body.toString()
}

export const extractPaginationSummary = (html) => {
  const page = String(html ?? '')
  const currentPage = Number.parseInt(
    page.match(/<a[^>]*class=["'][^"']*active[^"']*["'][^>]*>\s*(\d+)\s*<\/a>/i)?.[1] || '1',
    10,
  ) || 1

  const totalPages = Math.max(
    1,
    ...[...page.matchAll(/PageClick\('(\d+)'\)/g)]
      .map((match) => Number.parseInt(match[1], 10))
      .filter(Number.isFinite),
  )

  return {
    currentPage,
    totalPages,
    hasNext: currentPage < totalPages,
  }
}

export const extractSearchResults = (html) => {
  const page = String(html ?? '')
  const listingPattern = /<a href="([^"]*\/career-details[^"]*id=([^"&]+)[^"]*)" class="careers-item">[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<p>([^<]+)<\/p>[\s\S]*?<p class="label">([^<]+)<\/p>[\s\S]*?<p class="label">([^<]+)<\/p>/gi

  return [...page.matchAll(listingPattern)]
    .map((match) => {
      const href = normalizeDetailPath(decodeHtmlEntities(match[1]))
      const sourceUrl = toAbsoluteUrl(href, CAREER_DETAILS_URL)

      if (!sourceUrl) return null

      return {
        jobId: normalizeWhitespace(match[2]),
        title: normalizeWhitespace(match[3]),
        location: normalizeWhitespace(match[4]),
        country: normalizeWhitespace(match[5]),
        department: normalizeWhitespace(match[6]),
        sourceUrl,
      }
    })
    .filter(Boolean)
}

export const extractDetailSummary = (html) => {
  const page = String(html ?? '')
  const title = stripHtml(extractSectionMatch(page, /<h1>([\s\S]*?)<\/h1>/i))
  const applyUrl = toAbsoluteUrl(
    extractSectionMatch(
      page,
      /<a href="([^"]+)"\s*class="btn btn--primary">\s*Apply now\s*<\/a>/i,
    ),
    CAREER_DETAILS_URL,
  )
  const summaryTitle = stripHtml(extractSectionMatch(
    page,
    /<p><strong>([\s\S]*?)<\/strong><br\s*\/?>/i,
  ))
  const summaryMeta = stripHtml(extractSectionMatch(
    page,
    /<p><strong>[\s\S]*?<\/strong><br\s*\/?>\s*([\s\S]*?)<\/p>/i,
  ))

  const summaryParts = (summaryTitle || '').split(/\s*•\s*/).map(normalizeWhitespace).filter(Boolean)
  const metaParts = (summaryMeta || '').split(/\s*•\s*/).map(normalizeWhitespace).filter(Boolean)
  const closingText = metaParts.find((part) => /^Apply by /i.test(part))

  return {
    title: title || summaryParts[0] || null,
    company: summaryParts[1] || null,
    location: metaParts[0] || null,
    department: metaParts[1] || null,
    closingDate: closingText ? toIsoClosingDate(closingText.replace(/^Apply by /i, '')) : null,
    applyUrl,
  }
}

export const extractDetailDescription = (html) => {
  const page = String(html ?? '')
  const match = page.match(
    /<section class="career-details--list">([\s\S]*?)<\/section>\s*<\/div>\s*<div class="bkg--white career-details--additional">/i,
  )
  const sectionHtml = match?.[1]
  if (!sectionHtml) return null

  const sections = [...sectionHtml.matchAll(
    /<li>[\s\S]*?<button[^>]*>([\s\S]*?)<\/button>[\s\S]*?<div class="career-details-item--content">([\s\S]*?)<\/div>[\s\S]*?<\/li>/gi,
  )]
    .map((sectionMatch) => {
      const heading = stripHtml(sectionMatch[1])
      const content = stripHtml(sectionMatch[2])
      if (!heading || !content) return null
      return `${heading}: ${content}`
    })
    .filter(Boolean)

  return sections.length > 0 ? sections.join(' ') : null
}

const extractExperienceRequired = (text) => {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return null

  const match = normalized.match(/\b(?:minimum of\s*)?(\d+\s*[-–]\s*\d+\s*years?)\b/i)
  return match ? normalizeWhitespace(match[1]) : null
}

const defaultFetchText = (url, options = {}) => fetchTextWithRetry(url, {
  ...options,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ...(options.headers || {}),
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const buildCompanyPageFetchOptions = ({ page = 1 } = {}) => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: buildCompanyPageRequestBody({ page }),
})

const buildJobFromListingAndDetail = (listing, detailHtml) => {
  const detailSummary = extractDetailSummary(detailHtml)
  if (detailSummary.company !== COMPANY_NAME) {
    throw new Error('Texmo Industries detail page no longer resolves to Texmo Industries')
  }

  const jobDescription = extractDetailDescription(detailHtml)
  const location = detailSummary.location || [
    normalizeWhitespace(listing.location),
    normalizeWhitespace(listing.country),
  ].filter(Boolean).join(', ')

  return {
    title: normalizeWhitespace(detailSummary.title || listing.title),
    company: COMPANY_NAME,
    department: normalizeWhitespace(detailSummary.department || listing.department),
    location: normalizeWhitespace(location),
    city: normalizeWhitespace(location?.split(',')[0]),
    country: normalizeWhitespace(listing.country || 'India'),
    jobId: listing.jobId,
    requisitionId: listing.jobId,
    sourceUrl: listing.sourceUrl,
    applyUrl: detailSummary.applyUrl || listing.sourceUrl,
    link: detailSummary.applyUrl || listing.sourceUrl,
    employmentType: null,
    experienceRequired: extractExperienceRequired(jobDescription),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: detailSummary.closingDate,
    jobDescription,
    source: SOURCE,
    scrapedAt: new Date().toISOString(),
  }
}

export const createTexmoIndustriesScraper = ({
  maxPages = Number.POSITIVE_INFINITY,
  maxJobs = null,
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const officialCareersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersShellSignal(officialCareersHtml)) {
      throw new Error('Texmo careers page no longer matches the verified official public surface')
    }

    if (extractOfficialCompanyFilterValue(officialCareersHtml) !== COMPANY_FILTER_VALUE) {
      throw new Error('Texmo careers page no longer exposes the verified Texmo Industries company filter')
    }

    const jobs = []
    const seenJobIds = new Set()
    let totalPages = 1

    for (let page = 1; page <= totalPages && page <= maxPages; page += 1) {
      const listingsHtml = await fetchText(
        CAREERS_URL,
        buildCompanyPageFetchOptions({ page }),
      )
      const summary = extractPaginationSummary(listingsHtml)
      const listings = extractSearchResults(listingsHtml)
        .filter((listing) => normalizeWhitespace(listing.country)?.toLowerCase() === 'india')

      totalPages = summary.totalPages

      for (const listing of listings) {
        if (!listing.jobId || seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detailHtml = await fetchText(listing.sourceUrl)
        jobs.push(buildJobFromListingAndDetail(listing, detailHtml))

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (!summary.hasNext) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createTexmoIndustriesScraper().run(options)

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
