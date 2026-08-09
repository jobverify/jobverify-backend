import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.bluebinaries.com/become-a-bluebee/'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8211;|&#8212;/gi, '-')
    .replace(/\s+/g, ' ')
    .trim()

const extractFirst = (pattern, value) => normalizeWhitespace(pattern.exec(value || '')?.[1])

const stripHtmlToLines = (value) =>
  String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|li|ul|ol|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

const slugify = (value) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const parsePostedDate = (value) => {
  const match = /Posted on\s+(\d{2})-([A-Za-z]{3})-(\d{4})/i.exec(String(value ?? ''))
  if (!match) return null

  const monthMap = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  }

  const month = monthMap[match[2].toLowerCase()]
  if (!month) return null

  return `${match[3]}-${month}-${match[1]}`
}

export const isIndiaLocation = (location) =>
  /\bindia\b|\bchennai\b|\bbengaluru\b|\bbangalore\b|\bpune\b|\bhyderabad\b|\bmumbai\b|\bgurgaon\b|\bgurugram\b|\bnoida\b/i
    .test(String(location ?? ''))

const extractCity = (location) => {
  const parts = normalizeWhitespace(location)
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]

  const lastPart = parts.at(-1)
  if (/^india$/i.test(lastPart) || /^[A-Z]{2,3}$/i.test(lastPart)) {
    return parts.at(-2) || lastPart
  }

  return lastPart
}

const extractDescription = (jobHtml) => {
  const detailsHtml = extractFirst(
    /<div class="job-requirements"[\s\S]*?>([\s\S]*?)<\/div>\s*(?:<\/div>|<!--)/i,
    jobHtml,
  )

  return stripHtmlToLines(detailsHtml).join('\n') || null
}

export const extractJobEntries = (html) => {
  const jobs = []
  const sanitizedHtml = String(html ?? '').replace(/<!--[\s\S]*?-->/g, ' ')
  const chunks = sanitizedHtml.split(/<div class="acc-job-post">/i).slice(1)

  for (const chunk of chunks) {
    const title = extractFirst(/<div class="job-role">[\s\S]*?<h3>([\s\S]*?)<\/h3>/i, chunk)
    const postingRaw = extractFirst(/<div class="job-role">[\s\S]*?<span>([\s\S]*?)<\/span>/i, chunk)
    const location = extractFirst(/<div class="job-location">[\s\S]*?<span[^>]*>([\s\S]*?)<\/span\s*>/i, chunk)
    const jobId = extractFirst(/<div class="job-details"[^>]+data-attribute="([^"]+)"/i, chunk)
      || slugify(title)

    if (!title || !jobId) continue

    jobs.push({
      title,
      company: 'Blue Binaries',
      department: null,
      location,
      city: extractCity(location),
      jobId,
      requisitionId: null,
      sourceUrl: `${CAREER_PAGE_URL}#${jobId}`,
      applyUrl: `${CAREER_PAGE_URL}#${jobId}`,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: parsePostedDate(postingRaw),
      closingDate: null,
      jobDescription: extractDescription(chunk),
    })
  }

  return jobs
}

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
  const html = await fetchText(CAREER_PAGE_URL)
  const jobs = extractJobEntries(html)
    .filter((job) => isIndiaLocation(job.location))
    .map((job) => ({
      ...job,
      source: 'bluebinaries',
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))

  const maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null
  return maxJobs ? jobs.slice(0, maxJobs) : jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Blue Binaries scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'bluebinaries')
    console.log('DB result:', result)
    process.exit(0)
  }
}
