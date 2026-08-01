import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { RELEVANTZ_TECHNOLOGY_SERVICES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\s+/g, ' ')
  .trim()

const toTextLines = (html = '') => decodeHtmlEntities(String(html ?? ''))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\n')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|ul|ol|section|article|main|h\d)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split(/\r?\n/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const inferCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  return normalized
    .split(/[\/,|]/)
    .map((part) => normalizeWhitespace(part))
    .find(Boolean) || null
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^full\s*time$/i.test(normalized) || /^fulltime$/i.test(normalized)) return 'Full-time'
  return normalized
}

const splitSkills = (value) => normalizeWhitespace(value)
  .split(',')
  .map((item) => normalizeWhitespace(item))
  .filter(Boolean)

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page.replace(/<[^>]+>/g, ' '))

  return /<title>\s*Careers at Relevantz \| Join Our Digital Engineering & AI Innovation Team\s*<\/title>/i.test(page)
    && text.includes('Join us to create relevant solutions for customers that improve lives')
    && text.includes('Careers India')
    && text.includes('Java Full stack Developer')
    && text.includes('Data Architect')
}

export const extractIndiaJobs = (html = '') => {
  const lines = toTextLines(html)
  const careersIndiaIndex = lines.findIndex((line) => /^Careers India$/i.test(line))

  if (careersIndiaIndex === -1) return []

  const jobs = []
  let current = null

  const flushCurrent = () => {
    if (!current?.title || !current?.location) return

    const location = normalizeWhitespace(current.location)
    const slug = slugify(`${current.title}-${location}`)
    const description = normalizeWhitespace(current.descriptionLines.join(' ')) || current.title

    jobs.push({
      title: normalizeWhitespace(current.title),
      company: COMPANY,
      department: null,
      location,
      city: inferCity(location),
      country: 'India',
      jobId: `${SOURCE}-${slug}`,
      requisitionId: slug,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      employmentType: normalizeEmploymentType(current.positionType),
      experienceRequired: normalizeWhitespace(current.experience),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: current.requiredSkills,
      postingDate: null,
      closingDate: null,
      jobDescription: description,
    })
  }

  const relevantLines = lines.slice(careersIndiaIndex + 1)

  for (let index = 0; index < relevantLines.length; index += 1) {
    const line = relevantLines[index]
    if (/^©\s*\d{4}\s+Relevantz/i.test(line) || /^We are in the business of custom software engineering/i.test(line)) {
      break
    }

    const titleMatch = line.match(/^Job Title:\s*(.+)$/i)
    if (titleMatch) {
      flushCurrent()
      current = {
        title: titleMatch[1],
        location: null,
        positionType: null,
        experience: null,
        requiredSkills: [],
        descriptionLines: [],
      }
      continue
    }

    if (!current) continue

    const locationMatch = line.match(/^Location:\s*(.+)$/i)
    if (locationMatch) {
      current.location = locationMatch[1]
      continue
    }

    const positionTypeMatch = line.match(/^Position Type:\s*(.+)$/i)
    if (positionTypeMatch) {
      current.positionType = positionTypeMatch[1]
      continue
    }

    const experienceMatch = line.match(/^Experience:\s*(.+)$/i)
    if (experienceMatch) {
      current.experience = experienceMatch[1]
      continue
    }

    const skillsMatch = line.match(/^(?:Skillsets Required|Skills Required)\s*:\s*(.+)$/i)
    if (skillsMatch) {
      current.requiredSkills = splitSkills(skillsMatch[1])
      continue
    }

    if (/^APPLY NOW$/i.test(line)) continue

    const nextLine = relevantLines[index + 1] || ''
    const lineAfterNext = relevantLines[index + 2] || ''
    if (current.location && /^APPLY NOW$/i.test(nextLine) && /^Job Title:\s*/i.test(lineAfterNext)) {
      continue
    }

    current.descriptionLines.push(line)
  }

  flushCurrent()
  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createRelevantzTechnologyServicesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Relevantz Technology Services careers page no longer matches the trusted first-party surface')
    }

    const jobs = extractIndiaJobs(careersHtml)
    if (jobs.length === 0) {
      throw new Error('Relevantz Technology Services verified India openings are no longer exposed on the public careers page')
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createRelevantzTechnologyServicesScraper(options).run(options)

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
