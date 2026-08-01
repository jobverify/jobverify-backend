import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { COGNUS_TECHNOLOGY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = COGNUS_TECHNOLOGY_CATALOG.source
export const COMPANY = COGNUS_TECHNOLOGY_CATALOG.companyName
export const HOMEPAGE_URL = COGNUS_TECHNOLOGY_CATALOG.homepageUrl
export const CAREERS_URL = COGNUS_TECHNOLOGY_CATALOG.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&quot;/gi, '"')
  .replace(/&#34;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&nbsp;|&#160;/gi, ' ')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, ' '),
)

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

const extractHiddenInputValue = (html, id) =>
  String(html ?? '').match(new RegExp(`<input[^>]+id=["']${id}["'][^>]+value=["']([\\s\\S]*?)["']`, 'i'))?.[1]
  ?? null

export const extractHiddenInputJson = (html, id) => {
  const rawValue = extractHiddenInputValue(html, id)
  if (!rawValue) return null

  try {
    return JSON.parse(decodeHtmlEntities(rawValue))
  } catch {
    return null
  }
}

const buildFieldApiMap = (moduleMeta = []) => {
  const map = new Map()
  const jobModule = Array.isArray(moduleMeta)
    ? moduleMeta.find((module) => module?.api_name === 'Job_Openings')
    : null

  for (const field of jobModule?.fields ?? []) {
    if (!field?.id || !field?.api_name) continue
    map.set(String(field.id), field.api_name)
  }

  return map
}

const normalizeZohoJobRecord = (rawJob = {}, fieldApiMap = new Map()) => {
  const normalized = {}

  for (const [key, value] of Object.entries(rawJob)) {
    normalized[key] = value

    const apiName = fieldApiMap.get(String(key))
    if (apiName && normalized[apiName] == null) {
      normalized[apiName] = value
    }
  }

  return normalized
}

const getFirstPresent = (record, keys) => {
  for (const key of keys) {
    if (record?.[key] != null && record[key] !== '') return record[key]
  }
  return null
}

const buildLocation = ({ city, state, country }) => {
  const parts = [normalizeText(city), normalizeText(state), normalizeText(country)]
    .filter(Boolean)
  if (parts.length === 0) return null
  return [...new Set(parts)].join(', ')
}

const parseInteger = (value) => {
  const match = String(value ?? '').match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : null
}

const normalizePostingDate = (value) => {
  const text = normalizeText(value)
  if (!text) return null
  const match = text.match(/\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return normalized.includes('Life At Cognus')
    && normalized.includes('Join Us')
    && /cognustechnology\.zohorecruit\.in\/jobs\/Careers/i.test(page)
}

export const hasOfficialCareersSignal = (html = '') => {
  const pageJson = extractHiddenInputJson(html, 'pageJson')
  const meta = extractHiddenInputJson(html, 'meta')
  const jobsPayload = extractHiddenInputJson(html, 'jobs')

  return Array.isArray(jobsPayload)
    && meta?.org_info?.company_name === 'Cognus Technology'
    && meta?.list_url === CAREERS_URL
    && pageJson?.detail?.section?.data?.some((section) =>
      section?.blocktype === 'jobs'
      && /Join us/i.test(section?.title ?? '')
      && /Current Openings/i.test(section?.subtitle ?? ''),
    )
}

export const extractJobsFromOfficialBoard = (html = '') => {
  const moduleMeta = extractHiddenInputJson(html, 'moduleMeta') ?? []
  const jobsPayload = extractHiddenInputJson(html, 'jobs')

  if (!Array.isArray(jobsPayload)) return []

  const fieldApiMap = buildFieldApiMap(moduleMeta)

  return jobsPayload
    .map((rawJob) => {
      const record = normalizeZohoJobRecord(rawJob, fieldApiMap)
      const title = normalizeText(getFirstPresent(record, [
        'Job_Opening_Name',
        'Posting_Title',
        'Title',
        'job_title',
        'title',
      ]))

      if (!title) return null

      const cityValue = normalizeText(getFirstPresent(record, ['City', 'city']))
      const stateValue = normalizeText(getFirstPresent(record, ['State', 'state']))
      const countryValue = normalizeText(getFirstPresent(record, ['Country', 'country'])) || 'India'
      const location = buildLocation({
        city: cityValue,
        state: stateValue,
        country: countryValue,
      })
      const recordId = normalizeText(getFirstPresent(record, ['id', 'record_id', 'recordId']))
      const slug = slugify(recordId || title)

      return {
        title,
        jobId: `${SOURCE}-${slug}`,
        requisitionId: recordId || slug,
        sourceUrl: toAbsoluteUrl(getFirstPresent(record, ['applyUrl', 'sourceUrl']) || CAREERS_URL),
        applyUrl: toAbsoluteUrl(getFirstPresent(record, ['applyUrl', 'sourceUrl']) || CAREERS_URL),
        location,
        city: cityValue ? normalizeCity(cityValue) || cityValue : null,
        employmentType: normalizeText(getFirstPresent(record, ['Job_Type', 'jobType', 'type'])),
        workplaceType: null,
        experienceRequired: normalizeText(getFirstPresent(record, ['Work_Experience', 'experience'])),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        compensation: null,
        postingDate: normalizePostingDate(getFirstPresent(record, ['Date_Opened', 'publishDate'])),
        closingDate: null,
        openingsCount: parseInteger(getFirstPresent(record, ['Openings', 'Vacancies', 'no_of_openings'])),
        jobDescription: stripTags(getFirstPresent(record, ['Job_Description', 'jobDescription'])),
        companyCareerPage: CAREERS_URL,
      }
    })
    .filter(Boolean)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createCognusTechnologyScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('The verified Cognus Technology homepage no longer exposes the trusted careers handoff')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Cognus Technology careers board no longer matches the trusted Zoho contract')
    }

    const meta = extractHiddenInputJson(careersHtml, 'meta') ?? {}
    const jobs = extractJobsFromOfficialBoard(careersHtml)

    if (jobs.length === 0) {
      if (meta?._no_longer !== 'zr.pos.no.act') {
        throw new Error('Cognus Technology careers board changed materially and requires manual review')
      }
      return []
    }

    return jobs
      .sort((left, right) => left.title.localeCompare(right.title) || left.jobId.localeCompare(right.jobId))
      .map((job) => ({
        ...job,
        company: COMPANY,
        source: SOURCE,
        companyDomain: COGNUS_TECHNOLOGY_CATALOG.companyDomain,
        atsPlatform: COGNUS_TECHNOLOGY_CATALOG.atsPlatform,
        country: 'India',
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: (overrideNow || now)(),
      }))
  },
})

export const run = async (options = {}) => createCognusTechnologyScraper().run(options)

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
