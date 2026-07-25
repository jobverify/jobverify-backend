import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const RECRUITMENT_URL = 'https://www.sctimst.ac.in/recruitment/'
export const SOURCE = 'sreechitratirunalinstitute'

const COMPANY = 'Sree Chitra Tirunal Institute for Medical Sciences and Technology'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const JOB_DESCRIPTION = 'Official SCTIMST recruitment notification. Review the official notice for eligibility, selection process, and application instructions.'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.)\]])/g, '$1')
    .replace(/([([/])\s+/g, '$1')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|\/table|\/thead|\/tbody|\/tr|\/td|\/th)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|h[1-6]|ul|ol|table|thead|tbody|tr|td|th)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const toAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, RECRUITMENT_URL).toString()
  } catch {
    return null
  }
}

const parseClosingDate = (value) => {
  const match = normalizeWhitespace(value)?.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (!match) return null

  const [, day, month, year] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString()
}

const extractLinks = (html) => [...String(html ?? '').matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)]
  .map((match) => ({
    href: toAbsoluteUrl(match[2]),
    text: stripTags(match[3]),
  }))
  .filter((link) => link.href && link.text)

const extractTitle = (cellHtml) => {
  const boldTitle = normalizeWhitespace(
    String(cellHtml ?? '').match(/<b\b[^>]*>([\s\S]*?)<\/b>/i)?.[1],
  )
  if (boldTitle && !/^\[notification\]$/i.test(boldTitle)) {
    return boldTitle
  }

  const beforeFirstAnchor = stripTags(String(cellHtml ?? '').split(/<a\b/i)[0])
  if (beforeFirstAnchor) return beforeFirstAnchor

  const firstNonApplyLink = extractLinks(cellHtml).find((link) => !/apply now/i.test(link.text))
  return firstNonApplyLink?.text || null
}

const extractRequisitionId = ({ title, sourceUrl }) => {
  const titleText = normalizeWhitespace(title) || ''
  const sourceText = normalizeWhitespace(sourceUrl) || ''

  const projectMatch = titleText.match(/\bP\.\s*(\d+)\b/i)
  if (projectMatch) return `p-${projectMatch[1]}`

  const jsscMatch = titleText.match(/\bJSSC\s*(\d{4})\b/i)
  if (jsscMatch) return `jssc-${jsscMatch[1]}`

  const sourceProjectMatch = sourceText.match(/\bP\.\s*(\d+)\b/i)
  if (sourceProjectMatch) return `p-${sourceProjectMatch[1]}`

  return slugify(titleText)
}

const extractActiveTableHtml = (html) => {
  const page = String(html ?? '')
  const tables = [...page.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
  return tables.find((match) => {
    const table = match[0]
    return (
      /Active Notifications/i.test(table)
      && /Last Date\s*&amp;\s*Time/i.test(table)
      && /Recruitment Conducted/i.test(page.slice(match.index))
    )
  })?.[0] || null
}

const extractRows = (tableHtml) => [...String(tableHtml ?? '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map((match) => [...match[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((cell) => cell[1]))
  .filter((cells) => cells.length >= 2)

export const hasOfficialRecruitmentSignal = (html) => {
  const page = String(html ?? '')
  return (
    /Fake Recruitment Notifications in the Name of SCTIMST/i.test(page)
    && /Active Notifications/i.test(page)
    && /Last Date\s*&amp;\s*Time/i.test(page)
  )
}

export const extractActiveNotifications = (html) => {
  if (!hasOfficialRecruitmentSignal(html)) {
    throw new Error('SCTIMST recruitment page no longer matches the verified official surface')
  }

  const tableHtml = extractActiveTableHtml(html)
  if (!tableHtml) {
    throw new Error('SCTIMST recruitment page no longer exposes the expected Active Notifications table')
  }

  const jobs = extractRows(tableHtml)
    .map((cells) => {
      const titleCell = cells[0]
      const dateCell = cells[1]
      const title = extractTitle(titleCell)
      const links = extractLinks(titleCell)
      const applyLink = links.find((link) => /apply now/i.test(link.text)) || null
      const sourceLink = links.find((link) => !/apply now/i.test(link.text)) || applyLink
      const sourceUrl = sourceLink?.href || null
      const applyUrl = applyLink?.href || sourceUrl

      if (!title || !sourceUrl || !applyUrl) return null
      if (/^active notifications$/i.test(title)) return null

      const requisitionId = extractRequisitionId({ title, sourceUrl })
      if (!requisitionId) return null

      return {
        title,
        company: COMPANY,
        department: null,
        location: 'India',
        city: null,
        country: 'India',
        jobId: `${SOURCE}-${requisitionId}`,
        requisitionId,
        sourceUrl,
        applyUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: parseClosingDate(dateCell),
        jobDescription: JOB_DESCRIPTION,
      }
    })
    .filter(Boolean)

  if (jobs.length === 0) {
    throw new Error('SCTIMST recruitment page no longer exposes any active notification rows')
  }

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

export const createSreeChitraTirunalInstituteScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const html = await fetchText(RECRUITMENT_URL)
    const jobs = extractActiveNotifications(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async () => createSreeChitraTirunalInstituteScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ${COMPANY} scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
