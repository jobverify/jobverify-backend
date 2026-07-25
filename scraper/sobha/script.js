import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'sobha'
export const COMPANY = 'Sobha Limited'
export const CAREERS_URL = 'https://www.sobha.com/careers/'
export const PEOPLESTRONG_PORTAL_URL = 'https://sobhalimited-careers.peoplestrong.com/'
export const PEOPLESTRONG_URLINFO_API_URL = 'https://sobhalimited-careers.peoplestrong.com/api/cp/rest/altone/cp/urlinfo'

const PEOPLESTRONG_JOBS_API_BASE = 'https://sobhalimited-careers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;|&#038;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toArray = (value) => {
  if (Array.isArray(value)) return value
  if (value == null) return []
  return [value]
}

const unique = (values) => [...new Set(values.map(normalizeWhitespace).filter(Boolean))]

const deriveCity = (location) => {
  const parts = String(location ?? '').split('>').map(normalizeWhitespace).filter(Boolean)
  if (parts.length >= 3 && /^India$/i.test(parts[0])) return parts[2]
  return null
}

const formatLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parts = normalized.split('>').map(normalizeWhitespace).filter(Boolean)
  if (parts.length >= 3 && /^India$/i.test(parts[0])) {
    return [parts[2], parts[1], 'India'].filter(Boolean).join(', ')
  }

  return normalized
}

const buildJobDetailUrl = (job = {}) => {
  const explicit = normalizeWhitespace(job?.jobDetailUrl)
  if (explicit) return explicit

  const jobCode = normalizeWhitespace(job?.jobCode)
  return jobCode
    ? `${PEOPLESTRONG_PORTAL_URL}job/detail/${encodeURIComponent(jobCode)}`
    : null
}

export const buildPeopleStrongJobsApiUrl = ({ offset = 0, limit = 100 } = {}) =>
  `${PEOPLESTRONG_JOBS_API_BASE}?offset=${Number(offset)}&limit=${Number(limit)}`

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /Recruitment Fraud Alert/i.test(page)
    && /SOBHA Limited follows a transparent and merit-based recruitment process\./i.test(page)
    && /current openings/i.test(normalized)
}

export const hasPeopleStrongPortalSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Candidate Portal\s*<\/title>/i.test(page)
    && (/<app-root>\s*<\/app-root>/i.test(page) || /assets\/css\/styles_v2\.css/i.test(page))
}

export const hasVerifiedPeopleStrongUrlInfo = (payload = {}) => {
  const response = payload?.response ?? {}

  return response?.url === 'sobhalimited-careers.peoplestrong.com'
    && Number(response?.realm) === 1368
    && /sobha/i.test(String(response?.leftLogo ?? ''))
}

export const extractIndiaJobsFromPeopleStrongPayload = (
  payload = {},
  {
    scrapedAt = new Date().toISOString(),
  } = {},
) => {
  const jobs = Array.isArray(payload?.response) ? payload.response : null
  if (!jobs) {
    throw new Error('Sobha PeopleStrong jobs API response no longer matches the expected jobs array')
  }

  return jobs
    .filter((job) => /India/i.test([
      job?.locationHierarchy,
      job?.locationHierarchyComplete,
    ].filter(Boolean).join(' ')))
    .map((job) => {
      const title = normalizeWhitespace(job?.jobTitle || job?.designation)
      const jobId = normalizeWhitespace(job?.jobCode || job?.requisitionId)
      const requisitionId = normalizeWhitespace(job?.requisitionId)
      const rawLocation = normalizeWhitespace(job?.locationHierarchyComplete || job?.locationHierarchy)
      const location = formatLocation(rawLocation)
      const sourceUrl = buildJobDetailUrl(job)

      if (!title || !jobId || !location || !sourceUrl) return null

      const skills = unique([
        ...toArray(job?.skills?.mustTohave),
        ...toArray(job?.skills?.goodtohave),
      ])

      return {
        title,
        company: COMPANY,
        location,
        city: deriveCity(rawLocation),
        country: 'India',
        link: sourceUrl,
        applyUrl: sourceUrl,
        sourceUrl,
        source: SOURCE,
        jobId,
        requisitionId,
        department: normalizeWhitespace(job?.organizationUnit || job?.organizationUnitComplete),
        employmentType: normalizeWhitespace(job?.jobType || job?.employmentType),
        experienceRequired: normalizeWhitespace(job?.expRange),
        jobDescription: normalizeWhitespace(job?.jobDescription || job?.description),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: skills,
        postingDate: normalizeWhitespace(job?.jobPostedDate),
        validThrough: normalizeWhitespace(job?.jobClosureDate),
        remoteStatus: /\bremote\b/i.test(location) ? 'Remote' : 'On-site',
        scrapedAt,
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

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: options.method || 'GET',
  body: options.body ? JSON.stringify(options.body) : undefined,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    'Content-Type': 'application/json',
    Referer: PEOPLESTRONG_PORTAL_URL,
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSobhaScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Sobha careers page no longer matches the verified official careers surface')
    }

    const portalHtml = await fetchText(PEOPLESTRONG_PORTAL_URL)
    if (!hasPeopleStrongPortalSignal(portalHtml)) {
      throw new Error('Sobha PeopleStrong Candidate Portal no longer matches the verified handoff')
    }

    const urlInfo = await fetchJson(PEOPLESTRONG_URLINFO_API_URL, { method: 'GET' })
    if (!hasVerifiedPeopleStrongUrlInfo(urlInfo)) {
      throw new Error('Sobha PeopleStrong company identity no longer matches the verified portal')
    }

    return extractIndiaJobsFromPeopleStrongPayload(
      await fetchJson(buildPeopleStrongJobsApiUrl({ offset: 0, limit: 100 }), {
        method: 'POST',
        body: {},
      }),
      { scrapedAt: now() },
    )
  },
})

export const run = async (options = {}) => createSobhaScraper().run(options)

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
