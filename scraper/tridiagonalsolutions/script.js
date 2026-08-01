import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'tridiagonalsolutions'
export const COMPANY = 'Tridiagonal Solutions Pvt Ltd'
export const CAREERS_URL = 'https://www.tridiagonal.com/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#8211;|&#8212;/gi, '-')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value)
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtml(value).replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).href
  } catch {
    return null
  }
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)?.replace(/\s*,?\s*india\s*$/i, '')
  return normalized ? `${normalized}, India` : null
}

const deriveCity = (location) => {
  const raw = normalizeWhitespace(String(location ?? '').replace(/,\s*India$/i, ''))
  if (!raw) return null

  const primaryToken = normalizeWhitespace(raw.split(',')[0]?.replace(/\s*\([^)]*\)\s*$/g, ''))
  return primaryToken ? normalizeCity(primaryToken) : null
}

const deriveJobSlugFromUrl = (value) => {
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean)
    return slugify(segments.at(-1))
  } catch {
    return slugify(value)
  }
}

const deriveRemoteStatus = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/remote/i.test(normalized)) return 'Remote'
  if (/hybrid/i.test(normalized)) return 'Hybrid'
  return 'On-site'
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Careers\s*-\s*Tridiagonal Solutions\s*<\/title>/i.test(page)
    && /Search by title,\s*department,\s*or location/i.test(page)
    && /class="jobs-dept-select"/i.test(page)
    && /class="jobs-list"/i.test(page)
    && /class="job-row-title"/i.test(page)
    && /class="job-apply-btn"/i.test(page)
}

export const extractOpenings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Tridiagonal Solutions verified official public careers surface changed or disappeared')
  }

  const jobs = []
  const page = String(html ?? '')

  for (const match of page.matchAll(
    /<div class="job-row">([\s\S]*?)<a class="job-apply-btn" href="([^"]+)">\s*APPLY NOW\s*<\/a>\s*<\/div>/gi,
  )) {
    const rowHtml = match[1]
    const detailUrl = toAbsoluteUrl(match[2])
    const title = stripTags(rowHtml.match(/<h3 class="job-row-title">([\s\S]*?)<\/h3>/i)?.[1])

    const meta = [...rowHtml.matchAll(
      /<span class="job-meta-pill(?: job-type-pill)?">([\s\S]*?)<\/span>/gi,
    )].map((item) => stripTags(item[1]))

    const [department, rawLocation, postingDate, employmentType] = meta
    const location = normalizeLocation(rawLocation)

    if (!title || !department || !location || !detailUrl) continue

    jobs.push({
      title,
      department,
      location,
      city: deriveCity(location),
      postingDate: postingDate || null,
      employmentType: employmentType || null,
      sourceUrl: detailUrl,
      applyUrl: detailUrl,
      remoteStatus: deriveRemoteStatus(location),
    })
  }

  if (jobs.length === 0) {
    throw new Error('Tridiagonal Solutions verified official public careers surface changed or disappeared')
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

export const createTridiagonalSolutionsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    return extractOpenings(html).map((job) => {
      const identitySlug = deriveJobSlugFromUrl(job.sourceUrl)

      return {
        ...job,
        company: COMPANY,
        country: 'India',
        source: SOURCE,
        jobId: `${SOURCE}-${identitySlug}`,
        requisitionId: `${SOURCE}-${identitySlug}`,
        preferredQualification: null,
        requiredSkills: [],
        closingDate: null,
        jobDescription: null,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      }
    })
  },
})

export const run = async (options = {}) => createTridiagonalSolutionsScraper().run(options)

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
