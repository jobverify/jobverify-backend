import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'novartis'
export const COMPANY = 'Novartis'
export const CAREERS_URL = 'https://www.novartis.com/careers/career-search/tag/LOC_IN'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const buildDescription = ({ site, division, businessUnit, functionalArea }) =>
  [
    site ? `Site: ${site}.` : null,
    division ? `Division: ${division}.` : null,
    businessUnit ? `Business: ${businessUnit}.` : null,
    functionalArea ? `Functional Area: ${functionalArea}.` : null,
  ].filter(Boolean).join(' ') || null

const deriveCity = (site) => {
  const normalizedSite = normalizeWhitespace(site)
  if (!normalizedSite) return null

  const city = normalizedSite
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .split(',')[0]
    .trim()

  return city || null
}

const extractField = (rowHtml, fieldClass) => normalizeWhitespace(
  String(rowHtml ?? '').match(
    new RegExp(`<td[^>]*class=["'][^"']*${fieldClass}[^"']*["'][^>]*>([\\s\\S]*?)<\\/td>`, 'i'),
  )?.[1],
)

const extractJobLink = (rowHtml) => {
  const href = String(rowHtml ?? '').match(
    /<td[^>]*class=["'][^"']*views-field-field-job-title[^"']*["'][^>]*>\s*<a[^>]+href=["']([^"']+)["']/i,
  )?.[1]

  if (!href) return null

  try {
    return new URL(href, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const extractJobId = (sourceUrl) =>
  normalizeWhitespace(String(sourceUrl ?? '').match(/\/details\/([^/?#]+)/i)?.[1] ?? null)

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.novartis\.com\/careers\/career-search\/tag\/LOC_IN["']/i.test(page)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["']Novartis["']/i.test(page)
    && /<div class='view view-id-career_search view-display-id-page_3'>/i.test(page)
    && /<table[^>]*class="views-table responsive-enabled table table-striped"/i.test(page)
}

export const extractPagination = (html) => {
  const pages = [...String(html ?? '').matchAll(/\bhref=["'][^"']*\?page=(\d+)["']/gi)]
    .map((match) => Number.parseInt(match[1], 10))
    .filter(Number.isInteger)

  return pages.length > 0 ? Math.max(...pages) : 0
}

export const extractJobsFromHtml = (html, { scrapedAt = new Date().toISOString() } = {}) =>
  [...String(html ?? '').matchAll(/<tr[^>]*>\s*([\s\S]*?)\s*<\/tr>/gi)]
    .map((match) => match[1])
    .map((rowHtml) => {
      const sourceUrl = extractJobLink(rowHtml)
      const title = normalizeWhitespace(
        String(rowHtml).match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1],
      )
      const site = extractField(rowHtml, 'views-field-field-job-work-location')
      const country = extractField(rowHtml, 'views-field-field-job-country')
      const division = extractField(rowHtml, 'views-field-field-job-division')
      const businessUnit = extractField(rowHtml, 'views-field-field-job-business-unit')
      const functionalArea = extractField(rowHtml, 'views-field-field-job-functional-area')
      const postingDate = extractField(rowHtml, 'views-field-field-job-posted-date')

      if (!title || !sourceUrl || country !== 'India') return null

      const location = site ? `${site}, India` : 'India'
      const jobId = extractJobId(sourceUrl)

      return {
        title,
        company: COMPANY,
        location,
        city: deriveCity(site),
        country,
        department: functionalArea,
        team: businessUnit,
        source: SOURCE,
        sourceUrl,
        applyUrl: sourceUrl,
        link: sourceUrl,
        jobId,
        requisitionId: jobId,
        postingDate,
        employmentType: null,
        remoteStatus: null,
        jobDescription: buildDescription({
          site,
          division,
          businessUnit,
          functionalArea,
        }),
        requiredSkills: [],
        scrapedAt,
      }
    })
    .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const buildPageUrl = (pageNumber) => {
  if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
    return CAREERS_URL
  }

  const url = new URL(CAREERS_URL)
  url.searchParams.set('page', String(pageNumber))
  return url.toString()
}

export const createNovartisScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const seenUrls = new Set()
    const jobs = []
    let maxPage = 0

    for (let currentPage = 0; currentPage <= maxPage; currentPage += 1) {
      const html = await fetchText(buildPageUrl(currentPage))

      if (!hasOfficialCareersSignal(html)) {
        throw new Error('Novartis careers page no longer matches the verified first-party India jobs surface')
      }

      maxPage = Math.max(maxPage, extractPagination(html))

      for (const job of extractJobsFromHtml(html, { scrapedAt: now() })) {
        if (seenUrls.has(job.sourceUrl)) continue
        seenUrls.add(job.sourceUrl)
        jobs.push(job)

        if (Number.isFinite(maxJobs) && jobs.length >= maxJobs) {
          return jobs.slice(0, maxJobs)
        }
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createNovartisScraper(options).run(options)

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
