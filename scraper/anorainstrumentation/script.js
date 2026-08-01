import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_PAGE_URL = 'https://anoralabs.com/careers.html'

const SOURCE = 'anorainstrumentation'
const COMPANY = 'Anora Instrumentation Private Limited'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/section)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|ul|ol|h[1-6]|section)\b[^>]*>/gi, '\n'),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const canonicalizeApplyUrl = (value) => {
  if (!value) return null

  try {
    const url = new URL(value, CAREERS_PAGE_URL)
    url.protocol = 'https:'
    if (/anorasolutions\.com$/i.test(url.hostname)) {
      url.hostname = 'anoralabs.com'
    }
    return url.toString()
  } catch {
    return normalizeWhitespace(value)
  }
}

const normalizeLocation = (value) => normalizeWhitespace(
  String(value ?? '').replace(/\bBanglore\b/gi, 'Bangalore'),
)

const extractSectionItems = (html, heading) => {
  const block = String(html ?? '').match(
    new RegExp(`<h3[^>]*>\\s*${heading}\\s*<\\/h3>([\\s\\S]*?)(?=<h3|$)`, 'i'),
  )?.[1] || ''

  return [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return (
    /Discover opportunities/i.test(page)
    && /applyforjob/i.test(page)
    && /Application Software Lead Engineer|DFT Lead Engineer|Mechanical Design Engineer|Product Development Engineer/i.test(page)
  )
}

export const extractJobUrls = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    return []
  }

  const urls = new Set()

  for (const match of String(html ?? '').matchAll(/href=["']([^"']*applyforjob[^"']*\.html)["']/gi)) {
    const url = canonicalizeApplyUrl(match[1])
    if (url) urls.add(url)
  }

  return [...urls]
}

export const extractJobDetail = (html, sourceUrl) => {
  const title = normalizeWhitespace(
    String(html ?? '').match(/<h2[^>]*>\s*([^<]+?)\s*<\/h2>/i)?.[1],
  )
  const rawLocation = normalizeLocation(
    String(html ?? '').match(/<h2[^>]*>[\s\S]*?<\/h2>\s*<p[^>]*>\s*([^<]+?)\s*<\/p>/i)?.[1],
  )
  const city = normalizeCity(rawLocation || null)
  const qualifications = extractSectionItems(html, 'Key Qualifications')
  const responsibilities = extractSectionItems(html, 'Responsibilities')
  const additionalRequirements = extractSectionItems(html, 'Additional Requirements')
  const requiredSkills = [
    ...qualifications,
    ...responsibilities,
    ...additionalRequirements,
  ]
  const summary = stripHtml(
    String(html ?? '').match(/<h3[^>]*>\s*Summary\s*<\/h3>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
  )
  const minimumQualification = qualifications[0] || null
  const slug = slugify(title)

  return {
    title,
    company: COMPANY,
    department: null,
    location: rawLocation ? `${rawLocation}, India` : null,
    city,
    country: 'India',
    jobId: `${SOURCE}-${slug}`,
    requisitionId: `${SOURCE}-${slug}`,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification,
    preferredQualification: null,
    requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription: normalizeWhitespace([summary, ...requiredSkills].filter(Boolean).join(' ')),
    remoteStatus: 'On-site',
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createAnoraInstrumentationScraper = ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText: overrideFetchText, now: overrideNow } = {}) {
    const fetcher = overrideFetchText || fetchText
    const listingHtml = await fetcher(CAREERS_PAGE_URL)
    const jobUrls = extractJobUrls(listingHtml)

    if (jobUrls.length === 0) {
      throw new Error('Expected verified Anora careers surface with public opportunities')
    }

    const jobs = []

    for (const jobUrl of jobUrls) {
      const detailHtml = await fetcher(jobUrl)
      const detail = extractJobDetail(detailHtml, jobUrl)

      if (!detail.title || !detail.jobId) continue

      jobs.push({
        ...detail,
        source: SOURCE,
        link: detail.applyUrl || detail.sourceUrl,
        scrapedAt: (overrideNow || now)(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createAnoraInstrumentationScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total Anora Instrumentation jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
