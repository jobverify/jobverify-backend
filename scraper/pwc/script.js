import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.pwc.in/careers/experienced-jobs.html'

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

const extractFirst = (pattern, value) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? match[1] : null
}

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractMetaContent = (key, html) => {
  const escapedKey = escapeRegex(key)
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([\\s\\S]*?)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([\\s\\S]*?)["'][^>]+(?:property|name)=["']${escapedKey}["']`, 'i'),
  ]

  for (const pattern of patterns) {
    const value = extractFirst(pattern, html)
    if (value) return normalizeWhitespace(value)
  }

  return null
}

const parseEmbeddedArray = (pattern, html) => {
  const raw = extractFirst(pattern, html)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeTitle = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/^Job Position Title:\s*/i, '')
    .replace(/^IN[-_\s]+/i, '')
    .replace(/\u2013/g, ' - ')
    .replace(/_/g, ' '),
)
  ?.replace(/^\s*-\s*/, '')
  || null

const normalizeLocation = (value) => {
  const segments = String(value ?? '')
    .split(',')
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean)

  const uniqueSegments = [...new Set(segments)]
  if (!uniqueSegments.length) return null

  if (!uniqueSegments.some((segment) => /^india$/i.test(segment))) {
    uniqueSegments.push('India')
  }

  return uniqueSegments.join(', ')
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || /^india$/i.test(normalized)) return null
  return normalized.split(',')[0]?.trim() || null
}

const shouldSkipRow = (row) => {
  const title = normalizeWhitespace(row?.title)
  if (!title) return true
  return /do not apply|testing purpose/i.test(title)
}

const toAbsoluteUrl = (value) => {
  if (!value) return null

  try {
    return new URL(value, CAREER_PAGE_URL).toString()
  } catch {
    return null
  }
}

const extractDetailPageData = (html) => ({
  title: normalizeTitle(
    extractMetaContent('og:title', html)
      || extractFirst(/<title>\s*([\s\S]*?)\s*<\/title>/i, html),
  ),
  jobDescription: normalizeWhitespace(
    extractMetaContent('og:description', html)
      || extractMetaContent('description', html),
  ),
})

const enrichJobFromDetailPage = (job, detailHtml) => {
  const detail = extractDetailPageData(detailHtml)

  return {
    ...job,
    title: detail.title || job.title,
    jobDescription: detail.jobDescription || job.jobDescription,
  }
}

const extractEmbeddedRows = (html) => {
  const workdayRows = parseEmbeddedArray(
    /<!--\s*WDDATA\s*-->\s*var\s+jsondata\s*=\s*(\[[\s\S]*?\])\s*;/i,
    html,
  )
  const darwinboxRows = parseEmbeddedArray(
    /<!--\s*DBDATA\s*-->\s*var\s+dbdata\s*=\s*(\[[\s\S]*?\])\s*;/i,
    html,
  )

  return [
    ...darwinboxRows.map((row) => ({
      ...row,
      jobreqid: row.jobreqid || row.jobid,
    })),
    ...workdayRows,
  ]
}

export const buildSearchUrl = () => CAREER_PAGE_URL

export const extractSearchResults = (html) => {
  const jobs = extractEmbeddedRows(html)
    .filter((row) => !shouldSkipRow(row))
    .map((row) => {
      const title = normalizeTitle(row.title)
      const department = normalizeWhitespace(row.los)
      const location = normalizeLocation(row.location)
      const jobId = normalizeWhitespace(row.jobreqid || row.jobid)
      const requisitionId = normalizeWhitespace(row.reqid || row.jobreqid || row.jobid)
      const applyUrl = toAbsoluteUrl(row.apply)

      if (!title || !location || !jobId || !requisitionId || !applyUrl) {
        return null
      }

      return {
        title,
        company: 'PwC',
        department,
        location,
        city: extractCity(location),
        jobId,
        requisitionId,
        sourceUrl: applyUrl,
        applyUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.title.localeCompare(right.title))

  return [...new Map(jobs.map((job) => [job.jobId, job])).values()]
}

const mapWithConcurrency = async (items, limit, iteratee) => {
  const concurrency = Math.max(1, Number.isInteger(limit) ? limit : 1)
  const results = new Array(items.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < items.length) {
      const currentIndex = cursor
      cursor += 1
      results[currentIndex] = await iteratee(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )

  return results
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

export const createPwcScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const html = await fetchText(buildSearchUrl())
    const jobs = extractSearchResults(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs
    const enrichedJobs = await mapWithConcurrency(
      selectedJobs,
      6,
      async (job) => {
        if (!job.applyUrl || (job.jobDescription && job.experienceRequired)) {
          return job
        }

        try {
          const detailHtml = await fetchText(job.applyUrl)
          return enrichJobFromDetailPage(job, detailHtml)
        } catch {
          return job
        }
      },
    )

    return enrichedJobs.map((job) => ({
      ...job,
      source: 'pwc',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createPwcScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running PwC scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'pwc')
    console.log('DB result:', result)
    process.exit(0)
  }
}
