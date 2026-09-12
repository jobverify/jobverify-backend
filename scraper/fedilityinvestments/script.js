import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import FEDILITY_INVESTMENTS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = FEDILITY_INVESTMENTS_CATALOG
export const SOURCE = FEDILITY_INVESTMENTS_CATALOG.source
export const COMPANY = FEDILITY_INVESTMENTS_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = FEDILITY_INVESTMENTS_CATALOG.officialBrandName
export const VERIFIED_ON = FEDILITY_INVESTMENTS_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = FEDILITY_INVESTMENTS_CATALOG.verifiedSurfaceSummary
export const JOBS_PAGE_URL = FEDILITY_INVESTMENTS_CATALOG.companyCareerPage
export const JOBS_XML_URL = FEDILITY_INVESTMENTS_CATALOG.jobsFeedUrl
export const OFFICIAL_JOB_DETAIL_EXAMPLE_URL = FEDILITY_INVESTMENTS_CATALOG.officialJobDetailExampleUrl

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  Accept: 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<!\[CDATA\[/g, '')
  .replace(/\]\]>/g, '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const removeDiacritics = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/\p{Mark}+/gu, '')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = removeDiacritics(
    decodeHtmlEntities(value)
      .replace(/[–—]/g, '-')
      .replace(/\s+:/g, ':')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const extractTagValue = (tagName, value) => extractFirst(
  new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'),
  value,
)

const extractJobBlocks = (xml) => [...String(xml ?? '').matchAll(/<job>\s*[\s\S]*?<\/job>/gi)]
  .map((match) => match[0])

const extractListItems = (value) => [...String(value ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const uniqueValues = (values) => [...new Set(values.filter(Boolean))]

const titleCase = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .split(/\s+/)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')
  || null

const normalizeCountry = (value) => {
  const normalized = normalizeWhitespace(value)?.toUpperCase()
  if (!normalized) return null
  if (normalized === 'IN' || normalized === 'IND' || normalized === 'INDIA') return 'India'
  return titleCase(normalized)
}

const normalizeState = (value) => titleCase(value)

const buildLocation = ({ city, state, country }) => [city, state, country].filter(Boolean).join(', ') || null

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  return parsed.toISOString()
}

export const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/intern|internship|apprentice/.test(normalized)) return 'Internship'
  if (/contract|temporary|fixed term/.test(normalized)) return 'Contract'
  if (/regular|full[\s-]*time|permanent/.test(normalized)) return 'Full-time'
  if (/part[\s-]*time/.test(normalized)) return 'Part-time'
  return titleCase(normalized)
}

export const hasOfficialJobsPageSignal = (html = '') => {
  const source = String(html ?? '')
  const normalized = normalizeWhitespace(source)?.toLowerCase() || ''

  return (
    /<title>\s*Search Jobs - Find the right match for your skills and location\. \| Fidelity Careers\s*<\/title>/i.test(source)
    && /<h1>\s*Search Jobs\s*<\/h1>/i.test(source)
    && /Find the right match for your skills and location\./i.test(source)
    && /Life at Fidelity India/i.test(source)
    && /Bangalore/i.test(source)
    && /Chennai/i.test(source)
  ) || (
    /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(source)
    && normalized.includes('enable javascript and cookies to continue')
    && /\bjobs\.fidelity\.com\b/i.test(source)
  )
}

export const hasCloudflareChallengePageSignal = (html = '') => {
  const source = String(html ?? '')
  const normalized = normalizeWhitespace(source)?.toLowerCase() || ''

  return /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(source)
    && normalized.includes('enable javascript and cookies to continue')
    && /\bjobs\.fidelity\.com\b/i.test(source)
}

export const hasOfficialJobsFeedSignal = (xml = '') => {
  const source = String(xml ?? '')
  return /<publisher>\s*Fidelity Investments Careers\s*<\/publisher>/i.test(source)
    && /<publisherUrl>\s*https:\/\/jobs\.fidelity\.com\s*<\/publisherUrl>/i.test(source)
    && /<url><!\[CDATA\[https:\/\/jobs\.fidelity\.com\/in\/jobs\/\d+\/[^/\]]+\/\]\]><\/url>/i.test(source)
    && /<company><!\[CDATA\[Fidelity Investments\]\]><\/company>/i.test(source)
    && /<country><!\[CDATA\[IN\]\]><\/country>/i.test(source)
}

const parseFeedEntry = (block) => {
  const title = normalizeWhitespace(extractTagValue('title', block))
  const sourceUrl = normalizeWhitespace(extractTagValue('url', block))
  const jobId = normalizeWhitespace(extractTagValue('apijobid', block))
    || normalizeWhitespace(extractTagValue('requisitionid', block))
  const requisitionId = normalizeWhitespace(extractTagValue('requisitionid', block)) || jobId
  const city = normalizeWhitespace(extractTagValue('city', block))
  const state = normalizeState(extractTagValue('state', block))
  const country = normalizeCountry(extractTagValue('country', block))
  const descriptionHtml = extractTagValue('description', block)

  if (!title || !sourceUrl || !jobId || !city || !country) {
    return null
  }

  return {
    title,
    company: normalizeWhitespace(extractTagValue('company', block)) || OFFICIAL_BRAND_NAME,
    department: normalizeWhitespace(extractTagValue('category', block)),
    location: buildLocation({ city, state, country }),
    city,
    state,
    country,
    jobId,
    requisitionId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: normalizeEmploymentType(extractTagValue('jobtype', block)),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: uniqueValues(extractListItems(descriptionHtml)),
    postingDate: normalizeDate(extractTagValue('date', block)),
    closingDate: null,
    jobDescription: stripTags(descriptionHtml),
  }
}

const mergeLocations = (left, right) => uniqueValues([
  ...String(left || '').split(/\s*;\s*/),
  ...String(right || '').split(/\s*;\s*/),
]).join('; ') || null

const mergeFeedEntries = (existing, incoming) => ({
  ...existing,
  company: existing.company || incoming.company,
  department: existing.department || incoming.department,
  location: mergeLocations(existing.location, incoming.location),
  city: existing.city || incoming.city,
  state: existing.state || incoming.state,
  country: existing.country || incoming.country,
  applyUrl: existing.applyUrl || incoming.applyUrl,
  employmentType: existing.employmentType || incoming.employmentType,
  requiredSkills: uniqueValues([
    ...(existing.requiredSkills || []),
    ...(incoming.requiredSkills || []),
  ]),
  postingDate: existing.postingDate || incoming.postingDate,
  jobDescription: existing.jobDescription?.length >= (incoming.jobDescription?.length || 0)
    ? existing.jobDescription
    : incoming.jobDescription,
})

export const extractJobsFromFeed = (xml = '') => {
  const jobsByKey = new Map()

  for (const block of extractJobBlocks(xml)) {
    const job = parseFeedEntry(block)
    if (!job) continue

    const key = job.sourceUrl || job.jobId
    const existing = jobsByKey.get(key)
    jobsByKey.set(key, existing ? mergeFeedEntries(existing, job) : job)
  }

  return [...jobsByKey.values()]
}

const runCurlRequest = (url, execFileImpl = execFile) => new Promise((resolve, reject) => {
  const command = process.platform === 'win32' ? 'curl.exe' : 'curl'
  const args = [
    '-L',
    '--compressed',
    '-A',
    HEADERS['User-Agent'],
    '-H',
    `Accept: ${HEADERS.Accept}`,
    '--',
    url,
  ]

  execFileImpl(command, args, (error, stdout, stderr) => {
    if (error) {
      reject(error)
      return
    }

    const output = String(stdout ?? '')
    if (!output.trim()) {
      reject(new Error(stderr || `Empty response for ${url}`))
      return
    }

    resolve(output)
  })
})

export const createDefaultFetchText = ({
  fetchImpl = fetch,
  execFileImpl = execFile,
} = {}) => async (url) => {
  try {
    const response = await fetchImpl(url, { headers: HEADERS })
    if (response.ok) {
      return response.text()
    }

    const responseText = await response.text()
    if (response.status === 403 && hasCloudflareChallengePageSignal(responseText)) {
      return responseText
    }

    return runCurlRequest(url, execFileImpl)
  } catch {
    return runCurlRequest(url, execFileImpl)
  }
}

const defaultFetchText = createDefaultFetchText()

export const createFedilityInvestmentsScraper = ({
  now = () => new Date().toISOString(),
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    maxJobs: overrideMaxJobs = maxJobs,
  } = {}) {
    const jobsPageHtml = await fetchText(JOBS_PAGE_URL)
    if (!hasOfficialJobsPageSignal(jobsPageHtml) && !hasCloudflareChallengePageSignal(jobsPageHtml)) {
      throw new Error('Fedility Investments verified Fidelity India jobs page no longer matches the pinned public surface')
    }

    const jobsXml = await fetchText(JOBS_XML_URL)
    if (!hasOfficialJobsFeedSignal(jobsXml)) {
      throw new Error('Fedility Investments verified Fidelity India XML feed no longer matches the pinned public surface')
    }

    const listings = extractJobsFromFeed(jobsXml)
    const selected = Number.isInteger(overrideMaxJobs) ? listings.slice(0, overrideMaxJobs) : listings
    const scrapedAt = now()

    return selected.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createFedilityInvestmentsScraper().run(options)

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
