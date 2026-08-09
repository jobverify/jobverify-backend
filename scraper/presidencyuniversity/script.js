import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_URL = 'https://presidencyuniversity.in/careers'
export const HRONE_VACANCIES_URL = 'https://hr-1.in/b42a6e'
export const SOURCE = 'presidencyuniversity'
export const COMPANY_NAME = 'Presidency University'

const TRUSTED_HRONE_HOST = 'career.hrone.cloud'
const TRUSTED_HRONE_PORTAL_PATH = '/career-portal'
const TRUSTED_HRONE_APPLY_PATH = '/apply-job'
const TRUSTED_HRONE_DC = 'presidency'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' ')),
)

const resolveUrl = (value, baseUrl = CAREERS_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || normalized === '-') return null
  if (/,\s*india$/i.test(normalized)) return normalized
  if (/^bengaluru$/i.test(normalized)) return 'Bengaluru, India'
  return normalized
}

const normalizeBoardValue = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized === '-' ? null : normalized
}

const getCity = (location) => normalizeWhitespace(location)?.split(',')[0] || null

const buildJobDescription = ({
  jobFunction,
  experienceRequired,
  openings,
  workMode,
  location,
}) => {
  const parts = [
    jobFunction ? `Job function: ${jobFunction}.` : null,
    experienceRequired ? `Experience(years): ${experienceRequired}.` : null,
    openings ? `Number of openings: ${openings}.` : null,
    workMode ? `Preferred work mode: ${workMode}.` : null,
    location ? `Job location: ${location}.` : null,
  ].filter(Boolean)

  return parts.join(' ') || null
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const extractVacanciesBoardUrl = (html) => {
  const source = String(html ?? '')
  const match = source.match(/<a[^>]+href="([^"]+)"[^>]*>\s*See All Vacancies\s*<\/a>/i)

  if (!match) return null

  return resolveUrl(match[1], CAREERS_URL)
}

export const hasOfficialCareersSignal = (html) => {
  const source = String(html ?? '')

  return /Presidency University/i.test(source)
    && /At Presidency University we are committed to building a workplace/i.test(source)
    && /Current\s+Vacanc/i.test(source)
    && /vacancy-box/i.test(source)
    && /See All Vacancies/i.test(source)
    && /https:\/\/career\.hrone\.cloud\/apply-job\?/i.test(source)
}

export const isTrustedBoardPageUrl = (value) => {
  try {
    const url = new URL(value)
    return url.hostname === TRUSTED_HRONE_HOST
      && url.pathname === TRUSTED_HRONE_PORTAL_PATH
      && url.searchParams.get('dc') === TRUSTED_HRONE_DC
      && Boolean(url.searchParams.get('appId'))
      && Boolean(url.searchParams.get('rqt'))
      && Boolean(url.searchParams.get('cc'))
  } catch {
    return false
  }
}

export const toTrustedApplyUrl = (value) => {
  try {
    const url = new URL(value)
    if (url.hostname !== TRUSTED_HRONE_HOST) return null
    if (url.pathname !== TRUSTED_HRONE_APPLY_PATH) return null
    if (url.searchParams.get('dc') !== TRUSTED_HRONE_DC) return null
    if (!url.searchParams.get('appId')) return null
    if (!url.searchParams.get('rqt')) return null
    if (!url.searchParams.get('cc')) return null
    if (!url.searchParams.get('pid')) return null
    return url.toString()
  } catch {
    return null
  }
}

export const extractTrustedApplyPid = (value) => {
  try {
    const url = new URL(value)
    if (toTrustedApplyUrl(url.toString()) == null) return null
    return normalizeWhitespace(url.searchParams.get('pid'))
  } catch {
    return null
  }
}

const extractRequisitionIdFromHtml = (html) => (
  normalizeWhitespace(String(html ?? '').match(/\b(RE\d+)\b/i)?.[1])
)

const extractFieldValue = (boxHtml, labelPatterns) => {
  const fieldLines = [...String(boxHtml ?? '').matchAll(/<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

  for (const line of fieldLines) {
    for (const pattern of labelPatterns) {
      const match = line.match(pattern)
      if (match?.[1]) return normalizeWhitespace(match[1])
    }
  }

  return null
}

export const extractVacancyCards = (html) => (
  [...String(html ?? '').matchAll(/<div\b[^>]*class="[^"]*\bvacancy-box\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)]
    .map((match) => {
      const boxHtml = match[1]
      const title = stripTags(
        boxHtml.match(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/i)?.[2],
      )
      const applyUrl = toTrustedApplyUrl(
        resolveUrl(
          boxHtml.match(/<a\b[^>]*href="([^"]*career\.hrone\.cloud\/apply-job[^"]*)"[^>]*>/i)?.[1],
          CAREERS_URL,
        ),
      )

      if (!title || !applyUrl) return null

      return {
        title,
        requisitionId: extractRequisitionIdFromHtml(boxHtml) || extractTrustedApplyPid(applyUrl),
        jobFunction: extractFieldValue(boxHtml, [/^Job function\s*:\s*(.+)$/i]),
        experience: extractFieldValue(boxHtml, [/^Experience(?:\(years\))?\s*:\s*(.+)$/i]),
        openings: extractFieldValue(boxHtml, [/^Number of openings\s*:\s*(.+)$/i]),
        workMode: extractFieldValue(boxHtml, [/^Preferred work mode\s*:\s*(.+)$/i]),
        location: extractFieldValue(boxHtml, [/^Job location\s*:\s*(.+)$/i, /^Location\s*:\s*(.+)$/i]),
        applyUrl,
      }
    })
    .filter(Boolean)
)

export const extractHrOneJobs = (cards) => {
  const seenRequisitionIds = new Set()

  return (Array.isArray(cards) ? cards : []).map((card, index) => {
    const title = normalizeWhitespace(card?.title)
    const applyUrl = toTrustedApplyUrl(card?.applyUrl)
    const requisitionId = normalizeWhitespace(card?.requisitionId)
      || extractTrustedApplyPid(applyUrl)

    if (!title || !requisitionId || !applyUrl) {
      throw new Error(
        `Presidency University card ${index + 1} is missing trusted public apply metadata`,
      )
    }

    if (seenRequisitionIds.has(requisitionId)) {
      return null
    }
    seenRequisitionIds.add(requisitionId)

    const department = normalizeBoardValue(card?.jobFunction)
    const experienceRequired = normalizeBoardValue(card?.experience)
    const openings = normalizeBoardValue(card?.openings)
    const workMode = normalizeBoardValue(card?.workMode)
    const location = normalizeLocation(card?.location)

    return {
      title,
      company: COMPANY_NAME,
      department,
      location,
      city: getCity(location),
      country: 'India',
      jobId: requisitionId,
      requisitionId,
      sourceUrl: applyUrl,
      applyUrl,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: buildJobDescription({
        jobFunction: department,
        experienceRequired,
        openings,
        workMode,
        location,
      }),
    }
  }).filter(Boolean)
}

export const createPresidencyUniversityScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const now = options.now || (() => new Date().toISOString())
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error(
        'Presidency University careers page no longer matches the verified official careers surface',
      )
    }

    const vacanciesUrl = extractVacanciesBoardUrl(careersHtml)
    if (vacanciesUrl !== HRONE_VACANCIES_URL) {
      throw new Error(
        'Presidency University careers page no longer links to the verified public HROne vacancies surface',
      )
    }

    const jobs = extractHrOneJobs(extractVacancyCards(careersHtml))
    if (jobs.length === 0) {
      throw new Error(
        'Presidency University official careers page no longer exposes trusted inline vacancy cards',
      )
    }

    const selectedJobs = Number.isInteger(maxJobs) && maxJobs > 0
      ? jobs.slice(0, maxJobs)
      : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createPresidencyUniversityScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Presidency University scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
