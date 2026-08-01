import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://www.btlnet.co.in/careers.php'
export const APPLY_EMAIL = 'btlinrd-hr@btlnet.com'

const COMPANY = 'BTL India Pvt. Ltd.'
const SOURCE = 'btlindia'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtml(value)
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const buildAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const extractExperience = (title) => {
  const match = String(title ?? '').match(/(\d+\s+to\s+\d+\s+years?)/i)
  return normalizeWhitespace(match?.[1] || '') || null
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /BE PART OF OUR TEAM/i.test(page)
    && /btlinrd-hr@btlnet\.com/i.test(page)
    && /Job Opportunities/i.test(page)
    && /BTL India/i.test(page)
}

export const extractPublicListings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Expected verified BTL India careers surface with public opportunities')
  }

  const jobs = []

  for (const match of String(html ?? '').matchAll(/<h4\b[^>]*>\s*<a\b[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>\s*<\/h4>/gi)) {
    const sourceUrl = buildAbsoluteUrl(match[1], CAREERS_URL)
    const title = normalizeWhitespace(match[2])
    const slug = slugify(title)

    if (!sourceUrl || !title || !slug) continue

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: null,
      city: null,
      country: 'India',
      jobId: `${SOURCE}-${slug}`,
      requisitionId: `${SOURCE}-${slug}`,
      sourceUrl,
      applyUrl: `mailto:${APPLY_EMAIL}`,
      employmentType: null,
      experienceRequired: extractExperience(title),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    })
  }

  if (jobs.length === 0) {
    throw new Error('Expected verified BTL India careers surface with public opportunities')
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

export const createBTLIndiaScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    return extractPublicListings(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createBTLIndiaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total BTL India jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
