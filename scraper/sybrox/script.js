import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'sybrox'
export const COMPANY = 'Sybrox Tech Pvt. Ltd.'
export const HOMEPAGE_URL = 'https://sybrox.com/'
export const ABOUT_URL = 'https://sybrox.com/about'
export const CONTACT_URL = 'https://sybrox.com/contact'
export const CAREERS_URL = 'https://sybrox.com/rpo%20partner%20vacancies'
export const APPLY_URL = 'https://forms.gle/o43Zh9YvfH4sRCvo8'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const FETCH_TIMEOUT_MS = 15000

const NON_JOB_TITLES = new Set([
  'RPO Partner Vacancies',
  'About Us',
  'Contact Us',
  'Our Company',
  'Our Services',
  'Contact Info',
])

const createFetchTimeoutSignal = () => AbortSignal.timeout(FETCH_TIMEOUT_MS)

export const hasDnsResolutionFailure = (error) => {
  const code = String(error?.cause?.code ?? error?.code ?? '')
  const message = String(error?.cause?.message ?? error?.message ?? error ?? '')

  return code === 'ENOTFOUND'
    || /\bgetaddrinfo ENOTFOUND sybrox\.com\b/i.test(message)
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&#x2013;|&ndash;/gi, '–')
  .replace(/&#8212;|&#x2014;|&mdash;/gi, '—')
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\s+/g, ' ')
  .trim() || null

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    signal: createFetchTimeoutSignal(),
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const extractTextLines = (html) => decodeHtmlEntities(
  String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/section|\/article|\/main|\/header|\/footer|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<(?:p|div|section|article|main|header|footer|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)
  .split('\n')
  .map((line) => line.replace(/\s+/g, ' ').trim())
  .filter(Boolean)

const getNormalizedText = (html) => extractTextLines(html).join('\n')

const isJobMetaLine = (line) => /\|/.test(String(line ?? '')) && /\bExperience:/i.test(String(line ?? ''))
const isFooterLine = (line) => NON_JOB_TITLES.has(String(line ?? '')) || /^©\d{4}\b/.test(String(line ?? ''))
const isNoiseLine = (line) => line === '+' || /^Apply Now$/i.test(line)

const getLineValue = (line, prefix) => {
  const match = String(line ?? '').match(new RegExp(`^${prefix}:\\s*(.+)$`, 'i'))
  return normalizeWhitespace(match?.[1] ?? null)
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/full\s*time/.test(normalized)) return 'Full-time'
  if (/part\s*time/.test(normalized)) return 'Part-time'
  if (/contract/.test(normalized)) return 'Contract'
  if (/intern/.test(normalized)) return 'Internship'
  return normalizeWhitespace(value)
}

const extractCity = (value) => normalizeWhitespace(String(value ?? '').split(/,| – | - /)[0]) || null

const buildJobDescription = (lines = []) => lines
  .filter((line) => !isNoiseLine(line))
  .filter((line) => !/^Openings:/i.test(line))
  .filter((line) => !/^Job Description$/i.test(line))
  .join('\n') || null

const parseMetaLine = (line) => {
  const parts = String(line ?? '').split('|').map((part) => normalizeWhitespace(part)).filter(Boolean)
  const location = parts[0] || null
  const employmentType = normalizeEmploymentType(parts[1] || null)
  const experience = normalizeWhitespace(parts.find((part) => /^Experience:/i.test(part))?.replace(/^Experience:\s*/i, ''))

  return { location, employmentType, experience }
}

export const extractApplyUrls = (html) => [...new Set(
  [...String(html ?? '').matchAll(/https:\/\/forms\.gle\/[A-Za-z0-9_-]+/gi)].map((match) => match[0]),
)]

export const hasOfficialHomepageSignal = (html) => {
  const normalized = getNormalizedText(html)
  return /<title>\s*Sybrox Tech\s*<\/title>/i.test(String(html ?? ''))
    && normalized.includes('Empowering Businesses with Innovation & Technology')
    && normalized.includes('Sybrox is a next-generation IT training and career-launch platform built for the real world.')
    && normalized.includes('Paid Internships')
    && normalized.includes('Sybrox Tech Pvt. Ltd. is a fast-growing IT startup committed to building innovative mobile apps, software solutions and next-generation digital platforms.')
    && normalized.includes('careers@sybrox.com')
}

export const hasOfficialAboutSignal = (html) => {
  const normalized = getNormalizedText(html)
  return normalized.includes('About Us')
    && normalized.includes('Innovation. Integrity. Impact.')
    && normalized.includes('Sybrox is an integrated IT services, consulting, and training company that blends innovation with expertise to deliver impactful business and learning solutions.')
    && normalized.includes('We bring together IT services, consulting, training, and staffing under one roof.')
    && normalized.includes('Sybrox Tech Pvt. Ltd. is a fast-growing IT startup committed to building innovative mobile apps, software solutions and next-generation digital platforms.')
    && normalized.includes('careers@sybrox.com')
}

export const hasOfficialContactSignal = (html) => {
  const normalized = getNormalizedText(html)
  return normalized.includes('Contact Us')
    && normalized.includes('Let’s Build Something Great Together')
    && normalized.includes('Business Inquiries: info@sybrox.com')
    && normalized.includes('Join Our Team: careers@sybrox.com')
    && normalized.includes('Services Inquiries: services@sybrox.com')
    && normalized.includes('Working Hours: Mon–Sat, 9:00 AM – 6:00 PM IST')
    && normalized.includes('Sybrox Tech Pvt. Ltd. is a fast-growing IT startup committed to building innovative mobile apps, software solutions and next-generation digital platforms.')
}

const isPotentialJobStart = (line, nextLine) =>
  Boolean(line)
  && Boolean(nextLine)
  && !NON_JOB_TITLES.has(line)
  && isJobMetaLine(nextLine)

const buildJobObject = (blockLines = [], sharedApplyUrl) => {
  const heading = blockLines[0]
  const meta = parseMetaLine(blockLines[1])
  const title = getLineValue(blockLines.find((line) => /^Job:/i.test(line)), 'Job') || heading
  const company = getLineValue(blockLines.find((line) => /^Company:/i.test(line)), 'Company') || COMPANY
  const requiredSkills = (getLineValue(blockLines.find((line) => /^Required Skill:/i.test(line)), 'Required Skill') || '')
    .split(',')
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean)
  const minimumQualification =
    getLineValue(blockLines.find((line) => /^Eligibility:/i.test(line)), 'Eligibility')
    || getLineValue(blockLines.find((line) => /^Qualification:/i.test(line)), 'Qualification')
  const explicitLocation = getLineValue(blockLines.find((line) => /^Location:/i.test(line)), 'Location')
  const experienceRequired =
    meta.experience
    || getLineValue(blockLines.find((line) => /^Experience:/i.test(line)), 'Experience')
  const descriptionStart = blockLines.findIndex((line) => /^Job Description$/i.test(line))
  const descriptionLines = descriptionStart >= 0 ? blockLines.slice(descriptionStart + 1) : blockLines.slice(2)
  const location = explicitLocation || meta.location
  const city = extractCity(location)
  const jobId = `${SOURCE}-${slugify([company, title, location].filter(Boolean).join(' '))}`

  if (!title || !location || !jobId || !sharedApplyUrl) {
    return null
  }

  return {
    title,
    company,
    department: heading,
    location,
    city,
    state: null,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: CAREERS_URL,
    applyUrl: sharedApplyUrl,
    employmentType: meta.employmentType,
    experienceRequired,
    minimumQualification,
    preferredQualification: null,
    requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription: buildJobDescription(descriptionLines),
    remoteStatus: 'On-site',
  }
}

export const extractJobs = (html) => {
  const lines = extractTextLines(html)
  const sharedApplyUrl = extractApplyUrls(html).length === 1 ? extractApplyUrls(html)[0] : null
  const jobs = []

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isPotentialJobStart(lines[index], lines[index + 1])) continue

    const blockLines = [lines[index], lines[index + 1]]
    let cursor = index + 2

    while (cursor < lines.length && !isPotentialJobStart(lines[cursor], lines[cursor + 1]) && !isFooterLine(lines[cursor])) {
      blockLines.push(lines[cursor])
      cursor += 1
    }

    const job = buildJobObject(blockLines, sharedApplyUrl)
    if (job) jobs.push(job)

    index = cursor - 1
  }

  return jobs
}

export const hasOfficialCareersSignal = (html) => {
  const normalized = getNormalizedText(html)
  const applyUrls = extractApplyUrls(html)

  return /<title>\s*RPO Partner Vacancies\s*<\/title>/i.test(String(html ?? ''))
    && normalized.includes('RPO Partner Vacancies')
    && normalized.includes('Discover exciting career opportunities with leading organizations through Sybrox RPO Services.')
    && normalized.includes('Openings: 200 Vacancies')
    && normalized.includes('Apply Now')
    && normalized.includes('Sybrox Tech Pvt. Ltd. is a fast-growing IT startup committed to building innovative mobile apps, software solutions and next-generation digital platforms.')
    && applyUrls.length === 1
    && applyUrls[0] === APPLY_URL
    && extractJobs(html).length > 0
}

export const createSybroxScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    now = () => new Date().toISOString(),
  } = {}) {
    try {
      const homepage = await fetchPage(HOMEPAGE_URL)
      if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
        throw new Error('Response is not the verified official homepage for Sybrox')
      }

      const aboutPage = await fetchPage(ABOUT_URL)
      if (aboutPage.status !== 200 || !hasOfficialAboutSignal(aboutPage.html)) {
        throw new Error('Response is not the verified official about page for Sybrox')
      }

      const contactPage = await fetchPage(CONTACT_URL)
      if (contactPage.status !== 200 || !hasOfficialContactSignal(contactPage.html)) {
        throw new Error('Response is not the verified official contact page for Sybrox')
      }

      const careersPage = await fetchPage(CAREERS_URL)
      if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
        throw new Error('Response is not the verified official careers page for Sybrox')
      }

      const jobs = extractJobs(careersPage.html)
      const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

      return selectedJobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      }))
    } catch (error) {
      if (hasDnsResolutionFailure(error)) {
        return []
      }

      throw error
    }
  },
})

export const run = async (options = {}) => createSybroxScraper().run(options)

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
