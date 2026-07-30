import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import SETU_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = SETU_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.officialCareersPageUrl
export const CURRENT_OPENINGS_CSV_URL = PROVIDER_METADATA.currentOpeningsCsvUrl
export const CATEGORY_DESCRIPTIONS_CSV_URL = PROVIDER_METADATA.categoryDescriptionsCsvUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/[’‘]/g, "'")
  .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/[“”]/g, '"')
  .replace(/&#169;/gi, '(c)')
  .replace(/Ã¢â€ â€”/g, '->')
  .replace(/Ã‚Â©/g, '(c)')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const normalizeUrl = (value) => String(value ?? '').trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/csv,text/plain;q=0.8,*/*;q=0.7',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()
  const title = (extractTitle(page) || '').toLowerCase()

  return title === 'careers at setu | join our fintech team'
    && text.includes("come tackle india's toughest fintech problems with an exceptional set of people.")
    && text.includes("we are completely overhauling our country's dated fintech architecture")
    && text.includes('current openings')
    && text.includes('brokentusk technologies pvt. ltd')
}

export const hasPlaceholderOpeningsSignal = (html = '') =>
  /Fetching open roles/i.test(String(html ?? ''))

const parseCsvLine = (line) => {
  const columns = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      columns.push(current)
      current = ''
    } else {
      current += char
    }
  }

  columns.push(current)
  return columns.map((value) => normalizeWhitespace(value) || '')
}

const parseCsvTable = (csvText = '') => {
  const lines = String(csvText ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
    }
  }

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const columns = parseCsvLine(line)

    return headers.reduce((record, header, index) => {
      record[header] = columns[index] || ''
      return record
    }, {})
  })

  return {
    headers,
    rows,
  }
}

const hasHeaders = (headers, expectedHeaders) =>
  headers.length === expectedHeaders.length
  && headers.every((header, index) => header === expectedHeaders[index])

const extractTurbohireToken = (value) =>
  normalizeUrl(value).match(/\/get\/([^/?#]+)/i)?.[1] || null

const isTurbohireApplyUrl = (value) =>
  /^https:\/\/pinelabsgroup\.turbohire\.co\/get\/[^/?#]+$/i.test(normalizeUrl(value))

export const hasCurrentOpeningsCsvSignal = (csvText = '') => {
  const { headers, rows } = parseCsvTable(csvText)

  return hasHeaders(headers, ['Role', 'Description', 'Link', 'Category', 'Sub-category'])
    && rows.length > 0
    && rows.some((row) =>
      normalizeWhitespace(row.Role)
      && normalizeWhitespace(row.Category)
      && isTurbohireApplyUrl(row.Link),
    )
}

export const hasCategoryDescriptionsCsvSignal = (csvText = '') => {
  const { headers, rows } = parseCsvTable(csvText)
  const categories = new Set(rows.map((row) => normalizeWhitespace(row.Category)).filter(Boolean))

  return hasHeaders(headers, ['Category', 'Description'])
    && categories.has('Engineering')
    && categories.has('Payments')
}

const buildCategoryDescriptionMap = (csvText = '') => {
  const { rows } = parseCsvTable(csvText)

  return rows.reduce((map, row) => {
    const category = normalizeWhitespace(row.Category)
    const description = normalizeWhitespace(row.Description)

    if (category && description) {
      map.set(category, description)
    }

    return map
  }, new Map())
}

export const extractJobsFromCsv = (currentOpeningsCsv = '', categoryDescriptionsCsv = '') => {
  const { rows } = parseCsvTable(currentOpeningsCsv)
  const descriptionsByCategory = buildCategoryDescriptionMap(categoryDescriptionsCsv)
  const jobs = []
  const seenJobIds = new Set()

  for (const row of rows) {
    const title = normalizeWhitespace(row.Role)
    const applyUrl = normalizeUrl(row.Link)
    const jobId = extractTurbohireToken(applyUrl) || slugify(title)
    const category = normalizeWhitespace(row.Category)
    const subCategory = normalizeWhitespace(row['Sub-category'])
    const jobDescription = (
      descriptionsByCategory.get(subCategory)
      || descriptionsByCategory.get(category)
      || null
    )

    if (!title || !applyUrl || !jobId || !isTurbohireApplyUrl(applyUrl)) continue
    if (seenJobIds.has(jobId)) continue

    seenJobIds.add(jobId)
    jobs.push({
      jobId,
      title,
      department: category || subCategory || null,
      location: 'India',
      city: null,
      country: 'India',
      sourceUrl: applyUrl,
      applyUrl,
      jobDescription,
    })
  }

  return jobs
}

export const createSetuScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Setu careers page changed materially')
    }

    const currentOpeningsCsv = await fetchText(CURRENT_OPENINGS_CSV_URL)
    if (!hasCurrentOpeningsCsvSignal(currentOpeningsCsv)) {
      throw new Error('The verified Setu current openings CSV no longer matches the trusted public surface')
    }

    const categoryDescriptionsCsv = await fetchText(CATEGORY_DESCRIPTIONS_CSV_URL)
    if (!hasCategoryDescriptionsCsvSignal(categoryDescriptionsCsv)) {
      throw new Error('The verified Setu category descriptions CSV no longer matches the trusted public surface')
    }

    const extractedJobs = extractJobsFromCsv(currentOpeningsCsv, categoryDescriptionsCsv)
    if (extractedJobs.length === 0) {
      throw new Error('The verified Setu openings CSV did not expose any public jobs')
    }

    const limitedJobs = maxJobs ? extractedJobs.slice(0, maxJobs) : extractedJobs

    return limitedJobs.map((job) => ({
      title: job.title,
      company: COMPANY_NAME,
      department: job.department,
      location: job.location,
      city: job.city,
      country: job.country,
      jobId: job.jobId,
      requisitionId: null,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: job.jobDescription,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createSetuScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
