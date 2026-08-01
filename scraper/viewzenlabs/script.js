import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const CAREERS_URL = 'https://www.viewzenlabs.com/careers'

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractListItems = (value) => [...String(value ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const normalizeExperience = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const match = normalized.match(/\((\d+)\s*-\s*(\d+)\s*years\)/i)
  if (!match) return null

  return `${match[1]} - ${match[2]} Years`
}

export const extractCompanyLocation = (html) => {
  const aboutText = extractFirst(/Established in \d{4} in ([^,]+),/i, html)
  if (!aboutText) return 'India'
  return `${normalizeWhitespace(aboutText)}, India`
}

export const extractJobListings = (html) => {
  const location = extractCompanyLocation(html)
  const city = normalizeWhitespace(location?.replace(/,\s*India$/i, ''))
  const jobCards = [...String(html ?? '').matchAll(
    /<div class="icon-box[\s\S]*?<h4><a href="#">([\s\S]*?)<\/a><\/h4>\s*<p class="text-muted small">([\s\S]*?)<\/p>\s*<p>([\s\S]*?)<\/p>\s*<ul class="text-start small">([\s\S]*?)<\/ul>[\s\S]*?<\/div>\s*<\/div>/gi,
  )]

  return jobCards.map((match) => {
    const title = normalizeWhitespace(match[1])
    const roleSummary = normalizeWhitespace(match[2])
    const minimumQualification = stripTags(match[3])
    const requiredSkills = extractListItems(match[4])
    const department = normalizeWhitespace(roleSummary?.replace(/\s*\([^)]*\)\s*$/u, ''))

    return {
      title,
      location,
      city,
      jobId: slugify(title),
      requisitionId: slugify(title),
      employmentType: 'Full-time',
      experienceRequired: normalizeExperience(roleSummary),
      postingDate: null,
      closingDate: null,
      sourceUrl: CAREERS_URL,
      applyUrl: null,
      department,
      minimumQualification,
      requiredSkills,
    }
  }).filter((job) => job.title)
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createViewZenLabsScraper = ({ fetchText = defaultFetchText } = {}) => ({
  run: async ({ fetchText: overrideFetchText } = {}) => {
    const fetchImpl = overrideFetchText || fetchText
    const html = await fetchImpl(CAREERS_URL)
    const jobs = extractJobListings(html)

    return jobs.map((job) => ({
      ...job,
      company: 'ViewZen Labs',
      link: job.applyUrl || job.sourceUrl,
      source: 'viewzenlabs',
      preferredQualification: null,
      jobDescription: null,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createViewZenLabsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ViewZen Labs scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'viewzenlabs')
    console.log('DB result:', result)
    process.exit(0)
  }
}
