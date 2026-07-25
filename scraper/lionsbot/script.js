import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.lionsbot.com/careers/'
export const KULA_COMPANY_URL = 'https://careers.kula.ai/lionsbot'
export const KULA_JOBS_URL = 'https://careers.kula.ai/lionsbot?jobs=true'
export const SOURCE = 'lionsbot'
export const COMPANY = 'Lionsbot'

const EMPLOYMENT_TYPE_MAP = {
  full_time: 'Full-time',
  contract: 'Contract',
  internship: 'Internship',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /Start your career at LionsBot/i.test(page)
    && /Our Team Is In Search!/i.test(page)
    && /JOIN US TODAY/i.test(page)
    && /Fastest Growing Robotic Startup in Singapore/i.test(page)
}

export const extractKulaCompanyUrl = (html) => {
  const page = String(html ?? '')
  const match = page.match(/<a[^>]+href="(https:\/\/careers\.kula\.ai\/lionsbot\/?)"[^>]*>/i)

  if (!match) return null

  try {
    return new URL(match[1]).toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

const toPublicJobUrl = (jobId) => `https://careers.kula.ai/lionsbot/${jobId}/?jobs=true`

const parseEmbeddedJobs = (html) => {
  const serializedHtml = String(html ?? '')
  const patterns = [
    /\{\\"jobs\\":(\[.*?\]),\\"departments\\":/s,
    /\\"jobs\\":(\[.*?\]),\\"departments\\":/s,
    /"jobs":(\[.*?\]),"departments":/s,
  ]

  for (const pattern of patterns) {
    const match = serializedHtml.match(pattern)
    if (!match) continue

    try {
      return JSON.parse(
        match[1]
          .replace(/\\"/g, '"')
          .replace(/\\u0026/g, '&')
          .replace(/\\\\/g, '\\'),
      )
    } catch {
      return []
    }
  }

  return []
}

const isIndiaOffice = (office) => {
  const country = normalizeWhitespace(office?.country)
  if (country && /^india$/i.test(country)) return true

  const location = normalizeWhitespace(office?.location || office?.name)
  return Boolean(location && /(?:^|,\s*)india$/i.test(location))
}

const selectIndiaOffices = (offices = []) => {
  const explicitIndiaOffices = offices.filter(isIndiaOffice)
  if (!explicitIndiaOffices.length) return []

  const remoteIndiaOffices = offices.filter((office) => office?.remote && !isIndiaOffice(office))
  return [...remoteIndiaOffices, ...explicitIndiaOffices]
}

const normalizeLocation = (offices = []) => {
  const uniqueLocations = [...new Set(
    offices
      .map((office) => normalizeWhitespace(
        office?.location
        || office?.name
        || (office?.remote ? 'Remote' : null),
      ))
      .filter(Boolean),
  )]

  return uniqueLocations.length ? uniqueLocations.join('; ') : null
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/^remote(?:\b|;)/i.test(normalized)) return 'Remote'
  return normalized.split(/[;,]/)[0]?.trim() || null
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  return EMPLOYMENT_TYPE_MAP[normalized] || null
}

const inferCountry = (offices = []) => {
  for (const office of offices) {
    const country = normalizeWhitespace(office?.country)
    if (country) return country
  }

  return 'India'
}

const extractDescription = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || /^\$[0-9a-z]+$/i.test(normalized)) return null
  return normalized
}

export const buildSearchUrl = () => KULA_JOBS_URL

export const extractSearchResults = (html) => (
  parseEmbeddedJobs(html)
    .map((row) => {
      const title = normalizeWhitespace(row?.title)
      const jobId = normalizeWhitespace(row?.id)
      const offices = Array.isArray(row?.ats_job?.offices) ? row.ats_job.offices : []
      const indiaOffices = selectIndiaOffices(offices)
      const location = normalizeLocation(indiaOffices)
      const applyUrl = jobId ? toPublicJobUrl(jobId) : null

      if (!title || !jobId || !indiaOffices.length || !location || !applyUrl) {
        return null
      }

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(row?.ats_job?.ats_department?.name),
        location,
        city: extractCity(location),
        country: inferCountry(indiaOffices),
        jobId,
        requisitionId: jobId,
        sourceUrl: applyUrl,
        applyUrl,
        employmentType: normalizeEmploymentType(row?.ats_job?.employment_type),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: extractDescription(row?.ats_job?.job_description),
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.title.localeCompare(right.title))
)

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

export const createLionsbotScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const careersHtml = await fetchText(CAREER_PAGE_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Lionsbot careers page no longer matches the verified official public surface')
    }

    if (extractKulaCompanyUrl(careersHtml) !== KULA_COMPANY_URL) {
      throw new Error('Lionsbot careers page no longer links to the verified official Kula careers surface')
    }

    const html = await fetchText(buildSearchUrl())
    const jobs = extractSearchResults(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createLionsbotScraper().run()

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
