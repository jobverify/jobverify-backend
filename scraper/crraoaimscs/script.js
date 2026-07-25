import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'crraoaimscs'
export const COMPANY = 'CR Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS)'
export const HOMEPAGE_URL = 'https://crraoaimscs.res.in/'
export const CAREERS_PAGE_URL = 'https://crraoaimscs.res.in/careers.php'

const CITY = 'Hyderabad'
const STATE = 'Telangana'
const COUNTRY = 'India'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&ndash;|&#8211;|&mdash;|&#8212;/gi, '-')
  .replace(/[–—]/g, '-')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripComments = (value) => String(value ?? '').replace(/<!--[\s\S]*?-->/g, '')

const toIsoDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null
}

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (href) => {
  try {
    return new URL(String(href ?? ''), CAREERS_PAGE_URL).toString()
  } catch {
    return null
  }
}

const buildJobId = (title, requisitionId, postingDate) => {
  const parts = [
    SOURCE,
    requisitionId ? slugify(requisitionId) : null,
    slugify(title),
    postingDate ?? null,
  ].filter(Boolean)

  return parts.join('-')
}

const toDateOnly = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10)
}

const isActiveOpening = (job, nowValue) =>
  !job.closingDate || job.closingDate >= toDateOnly(nowValue)

const extractSectionHtml = (html, heading) =>
  String(html ?? '').match(
    new RegExp(
      `<h2\\b[^>]*>\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<\\/h2>([\\s\\S]*?)(?=<h2\\b[^>]*>\\s*Careers-(?:Technical|Non-Technical) Positions\\s*<\\/h2>|$)`,
      'i',
    ),
  )?.[1] ?? ''

const extractTableBlocks = (html) =>
  [...String(html ?? '').matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((match) => match[0])

const extractFirstParagraph = (tableHtml) =>
  stripComments(tableHtml).match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? ''

const extractRequisitionId = (titleHtml) =>
  normalizeWhitespace(titleHtml.match(/<strong>\s*\(([^)]+)\)\s*<\/strong>/i)?.[1])

const extractPostingDate = (tableHtml) =>
  toIsoDate(tableHtml.match(/<strong>\s*Posted Date\s*<\/strong>\s*[:：]?\s*([^<\s]+(?:\s*-\s*\d{4})?)/i)?.[1])

const extractClosingDate = (tableHtml) =>
  toIsoDate(tableHtml.match(/<strong>\s*Last Date\s*:?\s*<\/strong>\s*[:：]?\s*([^<\s]+(?:\s*-\s*\d{4})?)/i)?.[1])

const extractLinkByLabel = (tableHtml, label) => {
  const href = tableHtml.match(
    new RegExp(`<a\\b[^>]*href=["']([^"']+)["'][^>]*>\\s*${label}\\s*<\\/a>`, 'i'),
  )?.[1]

  return href ? toAbsoluteUrl(href) : null
}

const extractOpening = (tableHtml, department) => {
  const titleHtml = extractFirstParagraph(tableHtml)
  const title = normalizeWhitespace(
    titleHtml
      .replace(/<img\b[^>]*>/gi, ' ')
      .replace(/<strong>\s*\(([^)]+)\)\s*<\/strong>/gi, ''),
  )
    .replace(/\s*-->\s*$/g, '')
    .trim()
  const requisitionId = extractRequisitionId(titleHtml)
  const postingDate = extractPostingDate(tableHtml)
  const closingDate = extractClosingDate(tableHtml)
  const sourceUrl = extractLinkByLabel(tableHtml, 'View/Download Advertisement')
  const applyUrl = extractLinkByLabel(tableHtml, 'View/Download Application Form') || sourceUrl

  if (!title || !postingDate || !closingDate || !sourceUrl) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department,
    location: `${CITY}, ${STATE}, ${COUNTRY}`,
    city: CITY,
    state: STATE,
    country: COUNTRY,
    jobId: buildJobId(title, requisitionId, postingDate),
    requisitionId: requisitionId || null,
    sourceUrl,
    applyUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate,
    closingDate,
    jobDescription: `Official ${COMPANY} ${department.toLowerCase()} recruitment notice. Review the advertisement and application form for eligibility and submission details.`,
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return /<title>\s*CRRao AIMSCS\s*<\/title>/i.test(String(html ?? ''))
    && normalized.includes('C.R.Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS)')
    && normalized.includes('University of Hyderabad Campus, Gachibowli, Hyderabad - 500 046')
    && /href=["']\/careers\.php["']/i.test(String(html ?? ''))
}

export const hasCareersPageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Careers\s*<\/title>/i.test(page)
    && normalized.includes('Careers-Technical Positions')
    && normalized.includes('Careers-Non-Technical Positions')
    && normalized.includes('View/Download Advertisement')
    && (
      normalized.includes('CR Rao AIMSCS')
      || normalized.includes('CRRao AIMSCS')
      || normalized.includes('C.R.Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS)')
    )
}

export const extractOpenings = (html) => {
  if (!hasCareersPageSignal(html)) {
    return []
  }

  const sections = [
    ['Careers-Technical Positions', 'Technical Positions'],
    ['Careers-Non-Technical Positions', 'Non-Technical Positions'],
  ]

  return sections.flatMap(([heading, department]) =>
    extractTableBlocks(extractSectionHtml(html, heading))
      .map((tableHtml) => extractOpening(tableHtml, department))
      .filter(Boolean),
  )
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createCrRaoAimscsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)

    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('CR Rao AIMSCS verified official homepage no longer matches the expected first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasCareersPageSignal(careersHtml)) {
      throw new Error('CR Rao AIMSCS verified careers page no longer matches the expected first-party jobs surface')
    }

    const jobs = extractOpenings(careersHtml)
    if (jobs.length === 0) {
      throw new Error('CR Rao AIMSCS verified careers page no longer exposes the expected recruitment listings')
    }

    const nowValue = now()
    const activeJobs = jobs.filter((job) => isActiveOpening(job, nowValue))
    const selectedJobs = maxJobs ? activeJobs.slice(0, maxJobs) : activeJobs
    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: nowValue,
    }))
  },
})

export const run = async (options = {}) => createCrRaoAimscsScraper().run(options)

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
