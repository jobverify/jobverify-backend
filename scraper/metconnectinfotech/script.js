import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'metconnectinfotech'
export const API_URL = 'https://metconnectbackend-production.up.railway.app/api/jobs'
export const CAREER_PAGE_URL = 'https://metconnectinfotech.com/company-career'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeDescription = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[•·]/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) {
    return { location: null, city: null, country: null }
  }

  const [cityPart] = location.split(',')
  const city = normalizeWhitespace(cityPart)

  return {
    location,
    city,
    country: 'India',
  }
}

export const extractSearchResults = (payload) =>
  (Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [])
    .filter((record) => record?.isActive !== false)
    .map((record) => {
      const title = normalizeWhitespace(record.title)
      const jobId = normalizeWhitespace(record._id || record.id)
      const company = normalizeWhitespace(record.company) || 'MetConnect Infotech Pvt. Ltd.'
      const { location, city, country } = normalizeLocation(record.location)
      const jobDescription = normalizeDescription(record.description)

      if (!title || !jobId || !location || !jobDescription) {
        return null
      }

      return {
        title,
        company,
        location,
        city,
        state: null,
        country,
        department: null,
        jobDescription,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        experienceRequired: normalizeWhitespace(record.experience),
        salary: normalizeWhitespace(record.salary),
        jobId,
        requisitionId: null,
        postingDate: normalizeWhitespace(record.postedDate),
        closingDate: null,
        applyUrl: CAREER_PAGE_URL,
        sourceUrl: API_URL,
      }
    })
    .filter(Boolean)

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createMetConnectInfotechScraper = () => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const payload = await fetchJson(API_URL)
    const jobs = extractSearchResults(payload)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl || CAREER_PAGE_URL,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createMetConnectInfotechScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
