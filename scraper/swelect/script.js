import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'swelect'
export const COMPANY = 'Swelect'
export const HOMEPAGE_URL = 'https://www.swelectes.com/'
export const CAREERS_URL = 'https://www.swelectes.com/career.php'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const FETCH_TIMEOUT_MS = 15000

const INDIA_LOCATION_PATTERN =
  /\b(india|chennai|noida|bangalore|bengaluru|kerala|andhra pradesh)\b/i

const createFetchTimeoutSignal = () => AbortSignal.timeout(FETCH_TIMEOUT_MS)

const normalizeText = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const slugify = (value) => normalizeText(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const extractTextLines = (html) => String(html ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, '\n')
  .replace(/<style[\s\S]*?<\/style>/gi, '\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|section|article|li|ul|ol|h[1-6]|a|footer|main|header)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .split('\n')
  .map((line) => line.replace(/\s+/g, ' ').trim())
  .filter(Boolean)

const stripFieldLabel = (value, label) => normalizeText(
  String(value ?? '').replace(new RegExp(`^${label}\\s*:\\s*`, 'i'), ''),
)

const getPrimaryCity = (location) => {
  const normalized = normalizeText(location)
  if (!normalized) return null
  if (/bengaluru|bangalore/i.test(normalized)) return 'Bangalore'
  if (/chennai/i.test(normalized)) return 'Chennai'
  if (/noida/i.test(normalized)) return 'Noida'
  return null
}

const normalizeLocation = (value) => {
  const normalized = normalizeText(value)
  if (!normalized || !INDIA_LOCATION_PATTERN.test(normalized)) {
    return null
  }

  return {
    location: /\bindia\b/i.test(normalized) ? normalized : `${normalized}, India`,
    city: getPrimaryCity(normalized),
    country: 'India',
  }
}

const isRoleStartAt = (lines, index) =>
  Boolean(
    normalizeText(lines[index])
      && /^Qualification\s*:/i.test(String(lines[index + 1] ?? ''))
      && /^Experience\s*:/i.test(String(lines[index + 2] ?? ''))
      && /^Location\s*:/i.test(String(lines[index + 3] ?? '')),
  )

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /SWELECT Energy Systems Ltd\./i.test(page)
    && /SWELECT ENERGY SYSTEMS LIMITED/i.test(page)
    && /career\.php/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /Join us\s*&\s*Help build the future of Renewable Energy/i.test(page)
    && /Positions/i.test(page)
    && /Qualification\s*:/i.test(page)
    && /Location\s*:/i.test(page)
    && /hr@swelectes\.com/i.test(page)
}

export const extractJobCards = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Swelect verified first-party careers page no longer matches the trusted public surface')
  }

  const lines = extractTextLines(html)
  const positionsIndex = lines.findIndex((line) => /^Positions$/i.test(line))

  if (positionsIndex < 0) {
    throw new Error('Swelect verified first-party careers page no longer exposes the positions section')
  }

  const jobs = []
  let currentDepartment = null

  for (let index = positionsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]

    if (/^Join Our Team$/i.test(line)) {
      break
    }

    if (isRoleStartAt(lines, index)) {
      const title = normalizeText(lines[index])
      const minimumQualification = stripFieldLabel(lines[index + 1], 'Qualification')
      const experienceRequired = stripFieldLabel(lines[index + 2], 'Experience')
      const locationData = normalizeLocation(stripFieldLabel(lines[index + 3], 'Location'))

      if (!title || !minimumQualification || !experienceRequired || !locationData) {
        throw new Error('Swelect verified first-party careers page changed shape')
      }

      const descriptionParts = []
      let cursor = index + 4

      while (
        cursor < lines.length
        && !/^Apply$/i.test(lines[cursor] ?? '')
        && !/^Join Our Team$/i.test(lines[cursor] ?? '')
        && !isRoleStartAt(lines, cursor)
      ) {
        descriptionParts.push(lines[cursor])
        cursor += 1
      }

      const identityLocation = locationData.city || locationData.location
      const jobId = [
        SOURCE,
        slugify(title),
        slugify(identityLocation),
        slugify(minimumQualification),
      ].filter(Boolean).join('-')

      jobs.push({
        title,
        company: COMPANY,
        department: currentDepartment,
        location: locationData.location,
        city: locationData.city,
        country: locationData.country,
        jobId,
        requisitionId: jobId,
        sourceUrl: CAREERS_URL,
        applyUrl: CAREERS_URL,
        employmentType: null,
        experienceRequired,
        minimumQualification,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: descriptionParts.join(' ') || null,
      })

      index = /^Apply$/i.test(lines[cursor] ?? '') ? cursor : cursor - 1
      continue
    }

    currentDepartment = line
  }

  if (jobs.length === 0) {
    throw new Error('Swelect verified first-party careers page no longer exposes inline role blocks')
  }

  return jobs
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    signal: createFetchTimeoutSignal(),
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createSwelectScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Swelect verified official homepage no longer matches the trusted first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = extractJobCards(careersHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createSwelectScraper().run(options)

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
