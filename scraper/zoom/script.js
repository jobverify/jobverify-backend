import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const SEARCH_BASE_URL = 'https://careers.zoom.us/jobs/search'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
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

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || /^india$/i.test(normalized)) return null
  return normalized.split(',')[0]?.trim() || null
}

const isIndiaLocation = (location) => /(^|,\s*)india$/i.test(normalizeWhitespace(location) || '')

export const buildSearchUrl = () => {
  const url = new URL(SEARCH_BASE_URL)
  url.searchParams.set('query', 'India')
  return url.toString()
}

export const extractSearchResults = (html) => [...String(html).matchAll(
  /<article class="col-12 job-search-results-card-col"[\s\S]*?<\/article>/gi,
)]
  .map((match) => {
    const card = match[0]
    const title = normalizeWhitespace(
      extractFirst(/<a id="link_job_title_[^"]+" href="[^"]+">([\s\S]*?)<\/a>/i, card),
    )
    const sourceUrl = normalizeWhitespace(
      extractFirst(/<a id="link_job_title_[^"]+" href="([^"]+)"/i, card),
    )
    const requisitionId = normalizeWhitespace(
      extractFirst(
        /job-component-requisition-identifier[\s\S]*?<span[^>]*>\s*([^<]+)\s*<\/span>/i,
        card,
      ),
    )
    const location = normalizeWhitespace(
      extractFirst(
        /job-component-location[\s\S]*?<span[^>]*>\s*([^<]+)\s*<\/span>/i,
        card,
      ),
    )
    const department = normalizeWhitespace(
      extractFirst(
        /job-component-category[\s\S]*?<span[^>]*>\s*([^<]+)\s*<\/span>/i,
        card,
      ),
    )
    const remoteStatus = /job-component-remote/i.test(card) ? 'Remote' : 'On-site'

    if (!title || !sourceUrl || !requisitionId || !location || !isIndiaLocation(location)) {
      return null
    }

    return {
      title,
      company: 'Zoom',
      department,
      location,
      city: extractCity(location),
      jobId: requisitionId,
      requisitionId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus,
    }
  })
  .filter(Boolean)

export const extractPaginationSummary = (html) => ({
  hasNext: /aria-label="next"|>\s*next\s*</i.test(String(html)),
  totalJobCount: Number.parseInt(
    extractFirst(/Displaying\s*<b>(?:all&nbsp;)?(\d+)<\/b>\s*entries/i, html) || '',
    10,
  ) || null,
})

const fetchText = async (url) => {
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

export const run = async () => {
  const html = await fetchText(buildSearchUrl())
  const jobs = extractSearchResults(html)
  const maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null
  const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

  return selectedJobs.map((job) => ({
    ...job,
    source: 'zoom',
    link: job.applyUrl || job.sourceUrl,
    scrapedAt: new Date().toISOString(),
  }))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Zoom scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'zoom')
    console.log('DB result:', result)
    process.exit(0)
  }
}
