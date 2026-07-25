import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

import { INTECH_CREATIVE_SERVICES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = INTECH_CREATIVE_SERVICES_CATALOG.source
export const COMPANY = INTECH_CREATIVE_SERVICES_CATALOG.companyName
export const CAREERS_URL = INTECH_CREATIVE_SERVICES_CATALOG.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;|&#34;/gi, '"')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return CAREERS_URL
  }
}

const parseInteger = (value) => {
  const match = String(value ?? '').match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : null
}

const extractLoopItemBlocks = (html = '') =>
  [...String(html ?? '').matchAll(
    /<div data-elementor-type="loop-item"[\s\S]*?(?=<div data-elementor-type="loop-item"|<\/body>|$)/gi,
  )].map((match) => match[0])

const extractFieldMap = (block = '') => {
  const fields = new Map()
  for (const match of String(block).matchAll(
    /<h6 class="elementor-heading-title[^"]*">([^<]+):<\/h6>[\s\S]*?<div[^>]*class="[^"]*elementor-widget-text-editor[^"]*"[^>]*>\s*([\s\S]*?)<\/div>/gi,
  )) {
    fields.set(normalizeText(match[1]), stripTags(match[2]))
  }
  return fields
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /Career - The INTECH Group/i.test(page)
    && /At INTECH Creative Services/i.test(page)
    && /Find Your Perfect Role/i.test(page)
    && /\/career\/jobs\//i.test(page)
}

export const extractLoopGridJobCards = (html = '') => extractLoopItemBlocks(html)
  .map((block) => {
    const title = normalizeText(block.match(/<h2 class="elementor-heading-title[^"]*">([\s\S]*?)<\/h2>/i)?.[1])
    const applyUrl = normalizeText(block.match(/href="([^"]+)"[^>]*>\s*[\s\S]*?Apply Now/i)?.[1])
    const fields = extractFieldMap(block)

    if (!title || !applyUrl) return null

    const experienceRequired = fields.get('Experience') || null
    const employmentType = fields.get('Job Type') || null
    const openingsCount = parseInteger(fields.get('Vacancies'))
    const location = fields.get('Location') || null
    const sourceUrl = toAbsoluteUrl(applyUrl)
    const slug = decodeURIComponent(new URL(sourceUrl).pathname.split('/').filter(Boolean).at(-1) ?? title)

    return {
      title,
      department: fields.get('Department') || null,
      experienceRequired,
      employmentType,
      openingsCount,
      location,
      sourceUrl,
      applyUrl: sourceUrl,
      jobId: `${SOURCE}-${slugify(slug)}`,
      requisitionId: slug,
      jobDescription: [
        fields.get('Department') ? `Department: ${fields.get('Department')}` : null,
        experienceRequired ? `Experience: ${experienceRequired}` : null,
        employmentType ? `Job Type: ${employmentType}` : null,
        location ? `Location: ${location}` : null,
      ].filter(Boolean).join('\n') || null,
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createIntechCreativeServicesScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Intech Creative Services careers page no longer matches the trusted first-party surface')
    }

    const jobs = extractLoopGridJobCards(careersHtml)
    if (jobs.length === 0) {
      throw new Error('Intech Creative Services careers page no longer exposes the verified loop-grid job cards')
    }

    return jobs
      .sort((left, right) =>
        left.title.localeCompare(right.title)
        || (left.experienceRequired || '').localeCompare(right.experienceRequired || '')
        || left.jobId.localeCompare(right.jobId))
      .map((job) => ({
        ...job,
        city: job.location && !/work from home/i.test(job.location)
          ? normalizeCity(job.location) || job.location
          : null,
        workplaceType: job.location && /work from home/i.test(job.location) ? 'Remote' : null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        compensation: null,
        postingDate: null,
        closingDate: null,
        companyCareerPage: CAREERS_URL,
        company: COMPANY,
        source: SOURCE,
        companyDomain: INTECH_CREATIVE_SERVICES_CATALOG.companyDomain,
        atsPlatform: INTECH_CREATIVE_SERVICES_CATALOG.atsPlatform,
        country: 'India',
        link: job.applyUrl,
        scrapedAt: (overrideNow || now)(),
      }))
  },
})

export const run = async (options = {}) => createIntechCreativeServicesScraper().run(options)

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
