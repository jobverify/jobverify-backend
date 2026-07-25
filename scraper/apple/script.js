import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://jobs.apple.com/en-in/search?location=india-INDC'

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

const normalizeDescription = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\r/g, '')
    .replace(/\n{2,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim()

  return normalized || null
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const extractHydrationPayload = (html) => {
  const document = String(html ?? '')
  const marker = 'window.__staticRouterHydrationData = JSON.parse("'
  const start = document.indexOf(marker)

  if (start === -1) {
    throw new Error('Apple hydration payload marker not found')
  }

  let encoded = ''
  let slashCount = 0

  for (let index = start + marker.length; index < document.length; index += 1) {
    const char = document[index]

    if (char === '\\') {
      slashCount += 1
      encoded += char
      continue
    }

    if (char === '"' && slashCount % 2 === 0) {
      break
    }

    slashCount = 0
    encoded += char
  }

  return JSON.parse(JSON.parse(`"${encoded}"`))
}

const formatLocationEntry = (location) => {
  if (!location || typeof location !== 'object') return null

  const primary = normalizeWhitespace(
    location.name
      || location.city
      || location.metro
      || location.region
      || location.stateProvince
      || location.countryName,
  )
  const country = normalizeWhitespace(location.countryName)

  if (!primary) return country
  if (!country || primary.toLowerCase() === country.toLowerCase()) return primary

  return `${primary}, ${country}`
}

const extractCity = (locations) => {
  for (const location of Array.isArray(locations) ? locations : []) {
    const explicitCity = normalizeWhitespace(location?.city || location?.metro)
    if (explicitCity) return explicitCity

    const name = normalizeWhitespace(location?.name)
    const country = normalizeWhitespace(location?.countryName)
    if (name && (!country || name.toLowerCase() !== country.toLowerCase())) {
      return name
    }
  }

  return null
}

const buildDetailUrl = (job) => {
  const defaultDetailId = normalizeWhitespace(job?.reqId || job?.id || job?.positionId)
  const positionId = normalizeWhitespace(job?.positionId)
  const detailId = job?.type === 'PIPE' && positionId
    ? positionId
    : defaultDetailId
  const titleSlug = normalizeWhitespace(job?.transformedPostingTitle) || slugify(job?.postingTitle)

  if (!detailId || !titleSlug) return null

  const url = new URL(`/en-in/details/${detailId}/${titleSlug}`, 'https://jobs.apple.com')
  const teamCode = normalizeWhitespace(job?.team?.teamCode)
  if (teamCode) {
    url.searchParams.set('team', teamCode)
  }
  return url.toString()
}

export const buildSearchUrl = ({ page = 1 } = {}) => {
  const url = new URL(CAREER_PAGE_URL)
  const pageNumber = Math.max(1, Number(page) || 1)

  if (pageNumber > 1) {
    url.searchParams.set('page', String(pageNumber))
  }

  return url.toString()
}

export const extractPaginationSummary = (html) => {
  const search = extractHydrationPayload(html)?.loaderData?.search ?? {}
  const page = Math.max(1, Number(search.page) || 1)
  const pageSize = Array.isArray(search.searchResults) ? search.searchResults.length : 0
  const totalRecords = Number(search.totalRecords) || 0
  const totalPages = pageSize > 0 ? Math.ceil(totalRecords / pageSize) : 0

  return {
    page,
    pageSize,
    totalRecords,
    totalPages,
    hasNext: totalPages > 0 ? page < totalPages : false,
  }
}

export const extractSearchResults = (html) => {
  const search = extractHydrationPayload(html)?.loaderData?.search ?? {}
  const listings = Array.isArray(search.searchResults) ? search.searchResults : []

  return listings.map((job) => {
    const formattedLocations = [...new Set(
      (Array.isArray(job.locations) ? job.locations : [])
        .map((location) => formatLocationEntry(location))
        .filter(Boolean),
    )]
    const sourceUrl = buildDetailUrl(job)
    const requisitionId = normalizeWhitespace(job.reqId || job.positionId)

    if (!sourceUrl || !requisitionId) {
      return null
    }

    return {
      title: normalizeWhitespace(job.postingTitle),
      company: 'Apple',
      department: normalizeWhitespace(job.team?.teamName),
      location: formattedLocations.join(' | ') || null,
      city: extractCity(job.locations),
      jobId: requisitionId,
      requisitionId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeWhitespace(job.postingDate),
      closingDate: null,
      jobDescription: normalizeDescription(job.jobSummary),
    }
  }).filter(Boolean)
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

export const createAppleScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const jobs = []
    const seenJobIds = new Set()

    for (let page = 1; page <= maxPages; page += 1) {
      const html = await fetchText(buildSearchUrl({ page }))
      const listings = extractSearchResults(html)
      const summary = extractPaginationSummary(html)

      for (const job of listings) {
        if (seenJobIds.has(job.jobId)) continue
        seenJobIds.add(job.jobId)
        jobs.push({
          ...job,
          source: 'apple',
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: new Date().toISOString(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (!summary.hasNext) {
        break
      }
    }

    return jobs
  },
})

export const run = async () => createAppleScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Apple scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'apple')
    console.log('DB result:', result)
    process.exit(0)
  }
}
