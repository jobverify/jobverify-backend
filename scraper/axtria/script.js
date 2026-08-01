import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.axtria.com/axtria-careers/'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const ensureIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || /any axtria location/i.test(normalized)) return 'India'
  if (/india/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const inferCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || /any axtria location/i.test(normalized)) return null
  return normalized.split(',')[0]?.trim() || null
}

const inferRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote')) return 'Remote'
  return 'On-site'
}

const extractJobId = (url) => {
  try {
    return new URL(url).searchParams.get('jobId')
  } catch {
    return null
  }
}

export const buildSearchUrl = () => CAREER_PAGE_URL

export const extractSearchResults = (html) => {
  const jobs = []
  const pattern = /<div class="career-bottom-tabs-manual-block">([\s\S]*?)<\/div>\s*<\/div>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const block = match[1]
    const title = normalizeWhitespace(block.match(/<p class="text-2xl">([\s\S]*?)<\/p>/i)?.[1])
    const locationText = normalizeWhitespace(block.match(/<p class="text-lg">([\s\S]*?)<\/p>/i)?.[1])
    const applyUrl = normalizeWhitespace(block.match(/<a[^>]+class="[^"]*career-job-link[^"]*"[^>]+href="([^"]+)"/i)?.[1])
    const jobId = extractJobId(applyUrl)

    if (!title || !applyUrl || !jobId) continue

    const location = ensureIndiaLocation(locationText)
    const city = inferCity(locationText)

    jobs.push({
      title,
      company: 'Axtria',
      department: null,
      location,
      city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: applyUrl,
      applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: normalizeWhitespace(`Axtria India opening for ${title} in ${location}.`),
      remoteStatus: inferRemoteStatus(location),
    })
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'axtria',
  timeoutMs: 15000,
})

export const createAxtriaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const html = await fetchText(buildSearchUrl())
    const jobs = extractSearchResults(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'axtria',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createAxtriaScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Axtria scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'axtria')
    console.log('DB result:', result)
    process.exit(0)
  }
}
