import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://www.graycommit.com/careers'
export const APPLY_URL = 'https://forms.gle/JRRyEqayaV32F3xC7'
export const COMPANY = 'Graycommit'
export const SOURCE = 'graycommit'

const INDIA_CITY_ALIASES = new Map([
  ['bangalore', 'Bangalore'],
  ['bengaluru', 'Bangalore'],
])

const normalizeText = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const slugify = (value) => normalizeText(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const normalizeCity = (value) => {
  const normalized = normalizeText(value)?.toLowerCase()
  if (!normalized) return null
  return INDIA_CITY_ALIASES.get(normalized) || null
}

const normalizeLocation = (value) => {
  const city = normalizeCity(value)
  if (!city) return null

  return {
    city,
    location: `${city}, India`,
    country: 'India',
  }
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /graycommit/i.test(page)
    && /careers/i.test(page)
    && /apply\s+now/i.test(page)
    && new RegExp(APPLY_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(page)
}

const extractArticleBlocks = (html) => [...String(html ?? '').matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)]
  .map((match) => match[1])

export const extractJobCards = (html) => extractArticleBlocks(html)
  .map((articleHtml) => {
    const title = normalizeText(articleHtml.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1])
    const paragraphs = [...articleHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => normalizeText(match[1]))
      .filter(Boolean)
    const locationData = normalizeLocation(paragraphs[0])
    const jobDescription = paragraphs[1] || null
    const applyUrl = normalizeText(
      articleHtml.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>\s*apply\s+now\s*<\/a>/i)?.[1],
    )

    if (!title || !locationData || !applyUrl) return null

    const jobId = `${SOURCE}-${slugify(title)}-${slugify(locationData.city)}`

    return {
      title,
      company: COMPANY,
      department: null,
      location: locationData.location,
      city: locationData.city,
      country: locationData.country,
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription,
    }
  })
  .filter(Boolean)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createGraycommitScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Graycommit official careers surface changed; refusing to scrape')
    }

    const jobs = extractJobCards(careersHtml)

    if (jobs.length === 0) {
      throw new Error('Graycommit verified careers page no longer exposes the expected India opening')
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createGraycommitScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Graycommit scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
