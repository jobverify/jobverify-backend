import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://www.elektrobit.com/careers/'
export const JOBS_URL = 'https://jobs.elektrobit.com/'

const COMPANY = 'Elektrobit Automotive'
const SOURCE = 'elektrobitautomotive'

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
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  decodeHtml(value)
    .replace(/<(br|\/p|\/div|\/li|\/section|\/article|\/ul|\/ol|\/h[1-6]|\/span)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|section|article|ul|ol|h[1-6]|span)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const escapeRegExp = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const buildAbsoluteUrl = (value, baseUrl = JOBS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const unique = (items) => [...new Set(items.filter(Boolean))]

const toTextLines = (html) => decodeHtml(String(html ?? ''))
  .replace(/<(br|\/p|\/div|\/li|\/section|\/article|\/ul|\/ol|\/h[1-6]|\/span)\b[^>]*>/gi, '\n')
  .replace(/<(p|div|li|section|article|ul|ol|h[1-6]|span)\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split(/\r?\n/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Open positions/i.test(page)
    && /jobs\.elektrobit\.com/i.test(page)
    && /Working at Elektrobit/i.test(page)
}

export const hasOfficialJobsPortalSignal = (html) => {
  const page = String(html ?? '')
  return /Jobs@Elektrobit/i.test(page)
    && /Interested\? We are looking forward to receiving your application/i.test(page)
    && /India\s*-\s*Bangalore/i.test(page)
}

const extractListingEntries = (html) => {
  const source = String(html ?? '')
  const entries = []

  for (const match of source.matchAll(/<a\b[^>]*href="([^"]*?-j\d+\.html)"[^>]*>([\s\S]*?)<\/a>([\s\S]{0,400}?)(?=<a\b|<\/body>|$)/gi)) {
    const detailUrl = buildAbsoluteUrl(match[1], JOBS_URL)
    const title = stripTags(match[2])
    const trailingText = stripTags(match[3])

    if (!detailUrl || !title || !/India\s*-\s*Bangalore/i.test(trailingText)) {
      continue
    }

    entries.push({
      title,
      detailUrl,
      listingLocation: 'India - Bangalore',
      listingSummary: trailingText,
    })
  }

  return entries
}

const extractLabelValue = (lines, label) => {
  const labelRegex = new RegExp(`^${escapeRegExp(label)}\\s*:?\\s*(.*)$`, 'i')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const inlineMatch = line.match(labelRegex)
    if (inlineMatch) {
      const inlineValue = normalizeWhitespace(inlineMatch[1])
      if (inlineValue) return inlineValue

      for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
        const nextLine = lines[nextIndex]
        if (!nextLine) continue
        if (/^(Department|Employment Type|Experience level|Apply now!|Open positions)$/i.test(nextLine)) break
        return nextLine
      }
    }
  }

  return null
}

const extractDescription = (lines) => {
  const startIndex = lines.findIndex((line) => /^Hi,\s*Welcome to Elektrobit!/i.test(line))
  if (startIndex < 0) return null

  const collected = []
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (/^(Number of Positions|Department|Employment Type|Experience level|What you will deliver|What you will need)/i.test(line)) {
      break
    }

    if (!line || /^We would like to introduce ourselves\.$/i.test(line)) {
      continue
    }

    collected.push(line)
    if (collected.length >= 3) break
  }

  return collected.length > 0 ? collected.join(' ') : null
}

const extractRequiredSkills = (lines) => {
  const startIndex = lines.findIndex((line) => /What you will need to be successful/i.test(line))
  if (startIndex < 0) return []

  const skills = []
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line) continue
    if (/^Apply now!/i.test(line)) break
    if (/^(Qualifications|What You Bring)$/i.test(line)) continue
    if (/^(Data protection information|Imprint|Settings Cookies)$/i.test(line)) break
    if (/^[-*]/.test(line) || /years of experience/i.test(line) || /MBA/i.test(line) || /innovation/i.test(line)) {
      skills.push(line.replace(/^[-*]\s*/, ''))
    }
  }

  return unique(skills)
}

const extractApplyUrl = (html) => buildAbsoluteUrl(
  extractFirst(/<a\b[^>]*href="([^"]+)"[^>]*>\s*Apply now!\s*<\/a>/i, html),
  JOBS_URL,
)

const buildJob = ({ listing, detailHtml }) => {
  const lines = toTextLines(detailHtml)
  const title = normalizeWhitespace(
    extractFirst(/<h1[^>]*>([\s\S]*?)<\/h1>/i, detailHtml, (match) => stripTags(match[1])),
  ) || listing.title
  const rawLocation = extractLabelValue(lines, 'Location') || listing.listingLocation
  const location = /India/i.test(rawLocation) ? rawLocation : 'Bangalore, India'
  const city = /Bangalore/i.test(location) ? 'Bangalore' : location.split(',')[0]?.trim() || 'Bangalore'
  const department = extractLabelValue(lines, 'Department')
  const employmentType = extractLabelValue(lines, 'Employment Type') || 'Full-Time'
  const experienceRequired = extractLabelValue(lines, 'Experience level')

  return {
    title,
    company: COMPANY,
    department: department || null,
    location,
    city,
    country: 'India',
    jobId: slugify(title),
    requisitionId: slugify(title),
    sourceUrl: listing.detailUrl,
    applyUrl: extractApplyUrl(detailHtml) || listing.detailUrl,
    employmentType: employmentType === 'Full-Time' ? 'Full-time' : employmentType,
    experienceRequired: experienceRequired || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractRequiredSkills(lines),
    postingDate: null,
    closingDate: null,
    jobDescription: extractDescription(lines),
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

export const createElektrobitAutomotiveScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Elektrobit careers page no longer matches the verified official public careers surface')
    }

    const jobsPortalHtml = await fetchText(JOBS_URL)
    if (!hasOfficialJobsPortalSignal(jobsPortalHtml)) {
      throw new Error('Elektrobit jobs portal no longer matches the verified official public jobs surface')
    }

    const listings = extractListingEntries(jobsPortalHtml)
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.detailUrl)
      jobs.push(buildJob({ listing, detailHtml }))
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createElektrobitAutomotiveScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Elektrobit Automotive scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
