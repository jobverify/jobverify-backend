import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const BASE_URL = 'https://www.solitontech.com'
export const CAREER_PAGE_URL = `${BASE_URL}/job-openings/`

const SOURCE = 'solitontechnologies'
const COMPANY = 'Soliton Technologies'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
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
    .replace(/<(br|\/p|\/div|\/li|\/section|\/h[1-6]|\/ul)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  if (!value) return null
  try {
    return new URL(decodeHtmlEntities(value), BASE_URL).toString()
  } catch {
    return null
  }
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const slugFromUrl = (url) => {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] || null
  } catch {
    return null
  }
}

const extractSection = (html, heading) => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `<h[1-6][^>]*>\\s*${escapedHeading}\\s*:?\\s*<\\/h[1-6]>([\\s\\S]*?)(?=<h[1-6][^>]*>|APPLY NOW|$)`,
    'i',
  )
  return stripTags(extractFirst(pattern, html))
}

const extractSectionHtml = (html, heading) => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return extractFirst(
    new RegExp(
      `<h[1-6][^>]*>\\s*${escapedHeading}\\s*:?\\s*<\\/h[1-6]>([\\s\\S]*?)(?=<h[1-6][^>]*>|APPLY NOW|$)`,
      'i',
    ),
    html,
  )
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return /india/i.test(normalized) ? normalized : `${normalized}, India`
}

const extractExperience = (text) => {
  const match = String(text ?? '').match(/(\d+\s*[–-]\s*\d+)\s*years?/i)
  return match ? `${match[1].replace(/\s*[–-]\s*/g, '-')} years` : null
}

const extractLocation = (html) => {
  const location = extractFirst(/Work\s+Location\s*\(([^)]+)\)/i, html)
  return normalizeLocation(location)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Job Openings\s*\|\s*Soliton Technologies/i.test(page)
    && /CAREER OPPORTUNITIES WITH SOLITON/i.test(page)
    && /VIEW JOB DETAILS/i.test(page)
}

export const extractListings = (html) => {
  const listings = []
  const seenUrls = new Set()
  const pattern = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>\s*<p>([\s\S]*?)<\/p>[\s\S]{0,400}?<a[^>]+href=["']([^"']*\/jobs\/[^"']+\/)["'][^>]*>\s*VIEW JOB DETAILS\s*<\/a>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const title = normalizeWhitespace(match[1])
    const jobDescription = normalizeWhitespace(match[2])
    const sourceUrl = toAbsoluteUrl(match[3])
    const jobId = slugFromUrl(sourceUrl)

    if (!title || !sourceUrl || !jobId || seenUrls.has(sourceUrl)) continue
    seenUrls.add(sourceUrl)

    listings.push({
      title,
      company: COMPANY,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      jobDescription,
    })
  }

  return listings
}

export const extractJobDetail = (html, listing = {}) => {
  const title = normalizeWhitespace(
    extractFirst(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html),
  ) || listing.title || null
  const summary = extractSection(html, 'Summary')
  const responsibilities = extractSection(html, 'Key Responsibilities')
  const qualificationHtml = extractSectionHtml(html, 'Qualification')
  const qualification = stripTags(qualificationHtml)
  const location = extractLocation(html)
  const city = normalizeWhitespace(location)?.split(/[\/,]/)[0] || null
  const description = [summary, responsibilities]
    .filter(Boolean)
    .join('\n')
    .trim() || listing.jobDescription || null

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city,
    country: 'India',
    jobId: listing.jobId || slugFromUrl(listing.sourceUrl) || null,
    requisitionId: listing.requisitionId || listing.jobId || slugFromUrl(listing.sourceUrl) || null,
    sourceUrl: listing.sourceUrl || null,
    applyUrl: listing.applyUrl || listing.sourceUrl || null,
    employmentType: null,
    experienceRequired: extractExperience(summary),
    minimumQualification: normalizeWhitespace(
      extractFirst(/<li[^>]*>([\s\S]*?)<\/li>/i, qualificationHtml),
    ) || qualification?.split('\n').map((line) => normalizeWhitespace(line)).find(Boolean) || null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: description,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSolitonTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREER_PAGE_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Soliton official careers surface changed; refusing to assume no public listings')
    }

    const listings = extractListings(careersHtml)

    const jobs = await Promise.all(listings.map(async (listing) => {
      const detailHtml = await fetchText(listing.sourceUrl)
      return {
        ...extractJobDetail(detailHtml, listing),
        link: listing.applyUrl,
        source: SOURCE,
        scrapedAt: new Date().toISOString(),
      }
    }))

    return jobs
  },
})

export const run = async (options = {}) => createSolitonTechnologiesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Soliton Technologies scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
