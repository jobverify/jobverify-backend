import path from 'node:path'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import { MOGLIX_CATALOG } from './catalog.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'
import { withRetry } from '../utils/retry.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = MOGLIX_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_BOARD_URL = PROVIDER_METADATA.officialJobsBoardUrl
export const CAREER_SECTION_CONFIG_URL = PROVIDER_METADATA.careerSectionConfigurationUrl
export const GRID_DEFINITION_URL = PROVIDER_METADATA.gridDefinitionUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
export const EXPECTED_SITE_URL = PROVIDER_METADATA.expectedSiteUrl
export const EXPECTED_SITE_NAME = PROVIDER_METADATA.expectedSiteName
export const EXPECTED_GRID_CODE = PROVIDER_METADATA.expectedGridCode
export const EXPECTED_FORM_CODE = PROVIDER_METADATA.expectedFormCode
export const REQUEST_ENCRYPTION_KEY = '2e35f242a46d67eeb74aabc37d5e5d05'
export const REQUEST_ENCRYPTION_HEADER = 'fe-req-encrypted'
export const RESPONSE_ENCRYPTION_HEADER = 'fe-res-encrypted'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const evpBytesToKey = (password, salt, keyLen, ivLen) => {
  let material = Buffer.alloc(0)
  let previous = Buffer.alloc(0)
  const passphrase = Buffer.isBuffer(password) ? password : Buffer.from(password, 'utf8')

  while (material.length < keyLen + ivLen) {
    previous = createHash('md5')
      .update(Buffer.concat([previous, passphrase, salt]))
      .digest()
    material = Buffer.concat([material, previous])
  }

  return {
    key: material.subarray(0, keyLen),
    iv: material.subarray(keyLen, keyLen + ivLen),
  }
}

export const encryptJsonCiphertext = (payload, {
  passphrase = REQUEST_ENCRYPTION_KEY,
  saltHex,
  randomBytesImpl = randomBytes,
} = {}) => {
  const plaintext = JSON.stringify(payload)
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : randomBytesImpl(8)
  const { key, iv } = evpBytesToKey(passphrase, salt, 32, 16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ])

  return Buffer.concat([Buffer.from('Salted__'), salt, encrypted]).toString('base64')
}

export const decryptJsonCiphertext = (ciphertext, {
  passphrase = REQUEST_ENCRYPTION_KEY,
} = {}) => {
  const raw = Buffer.from(String(ciphertext), 'base64')
  if (raw.subarray(0, 8).toString('utf8') !== 'Salted__') {
    throw new Error('Moglix encrypted payload no longer uses the verified OpenSSL salt wrapper')
  }

  const salt = raw.subarray(8, 16)
  const encrypted = raw.subarray(16)
  const { key, iv } = evpBytesToKey(passphrase, salt, 32, 16)
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8')

  return JSON.parse(decrypted)
}

const buildEncryptedRequest = (payload, {
  headerToken,
  passphrase = REQUEST_ENCRYPTION_KEY,
  saltHex,
  randomBytesImpl = randomBytes,
} = {}) => {
  const requestToken = headerToken || randomBytesImpl(4).toString('hex')
  const ciphertext = encryptJsonCiphertext(payload, {
    passphrase,
    saltHex,
    randomBytesImpl,
  })

  return {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Referer: 'https://moglix.flexiele.com/',
      [REQUEST_ENCRYPTION_HEADER]: requestToken,
    },
    body: JSON.stringify({
      [requestToken]: ciphertext,
    }),
  }
}

const decryptEncryptedResponse = (rawJson, responseHeaders = {}, {
  passphrase = REQUEST_ENCRYPTION_KEY,
} = {}) => {
  const headerLookup = typeof responseHeaders?.get === 'function'
    ? responseHeaders.get(RESPONSE_ENCRYPTION_HEADER)
    : responseHeaders?.[RESPONSE_ENCRYPTION_HEADER]
      || responseHeaders?.[RESPONSE_ENCRYPTION_HEADER.toLowerCase()]
  const responseToken = headerLookup
    || (rawJson && typeof rawJson === 'object' && Object.keys(rawJson).length === 1
      ? Object.keys(rawJson)[0]
      : null)

  if (!responseToken || typeof rawJson?.[responseToken] !== 'string') {
    throw new Error('Moglix encrypted response no longer matches the verified public API wrapper')
  }

  return decryptJsonCiphertext(rawJson[responseToken], { passphrase })
}

export const hasOfficialCareersPageSignal = (html) =>
  /moglix\.flexiele\.com\/careers\/moglix\/jobs/i.test(String(html ?? ''))
  && /EXPLORE OPPORTUNITIES/i.test(String(html ?? ''))
  && /APPLY NOW/i.test(String(html ?? ''))

export const createCareerSectionConfigPayload = (siteUrl = EXPECTED_SITE_URL) => ({
  formCode: 'FRM0001493',
  sorting: [],
  requiresCounts: true,
  skip: 0,
  take: 50000,
  where: {
    ignoreAccent: false,
    isComplex: true,
    condition: 'and',
    predicates: [
      {
        ignoreAccent: true,
        isComplex: false,
        field: 'site_url',
        operator: 'equal',
        value: siteUrl,
        ignoreCase: true,
      },
    ],
  },
})

export const createJobsListPayload = ({
  formCode = EXPECTED_FORM_CODE,
  gridCode = EXPECTED_GRID_CODE,
  skip = 0,
  take = 50000,
} = {}) => ({
  formCode,
  gridCode,
  sorted: [],
  requiresCounts: true,
  skip,
  take,
})

const extractCareerSectionRow = (payload) =>
  Array.isArray(payload?.data?.rows) ? payload.data.rows[0] ?? null : null

const hasExpectedGridSchema = (payload) => {
  if (!payload || payload.code !== EXPECTED_GRID_CODE || payload.formCode !== EXPECTED_FORM_CODE) {
    return false
  }

  const fields = Array.isArray(payload.columns)
    ? payload.columns.map((column) => normalizeWhitespace(column?.field)).filter(Boolean)
    : []

  return ['job_title', 'date_posted', 'location', 'department', 'functional_area', 'business_unit_name']
    .every((field) => fields.includes(field))
}

const normalizePostingDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const ddmmyyyy = normalized.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    return `${year}-${month}-${day}`
  }

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

const formatExperience = (min, max) => {
  const hasMin = Number.isFinite(min)
  const hasMax = Number.isFinite(max)

  if (hasMin && hasMax) {
    return min === max ? `${min} Years` : `${min}-${max} Years`
  }
  if (hasMin) return `${min}+ Years`
  if (hasMax) return `Up to ${max} Years`
  return null
}

const normalizeLocationLabel = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return 'India'
  return /india/i.test(normalized) ? normalized : `${normalized}, India`
}

const extractCity = (value) => normalizeWhitespace(String(value ?? '').split(',')[0]) || null

const mapJob = (row) => {
  const jobId = normalizeWhitespace(row?.id)
  const title = normalizeWhitespace(row?.job_title)
  if (!jobId || !title) return null

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(row?.department),
    location: normalizeLocationLabel(row?.location),
    city: extractCity(row?.location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: `${JOBS_BOARD_URL.replace('/jobs', '')}/job-description/${jobId}`,
    applyUrl: `${JOBS_BOARD_URL.replace('/jobs', '')}/apply/${jobId}`,
    employmentType: normalizeWhitespace(row?.job_type),
    experienceRequired: formatExperience(row?.min_yrs_of_exp, row?.max_yrs_of_exp),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: Array.isArray(row?.skill)
      ? row.skill.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
      : [],
    postingDate: normalizePostingDate(row?.date_posted),
    closingDate: null,
    jobDescription: normalizeWhitespace(row?.jd),
    functionalArea: normalizeWhitespace(row?.functional_area),
    businessUnit: normalizeWhitespace(row?.business_unit_name),
  }
}

export const extractSearchResults = (payload) => {
  const rows = Array.isArray(payload?.data?.rows) ? payload.data.rows : []
  return rows.map((row) => mapJob(row)).filter(Boolean)
}

const defaultFetchPage = async (url) => ({
  status: 200,
  url,
  html: await fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: 'moglix-html',
    timeoutMs: 15000,
  }),
})

const defaultFetchJson = async (url) => ({
  status: 200,
  url,
  json: await fetchJsonWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    label: 'moglix-json',
    timeoutMs: 15000,
  }),
})

const defaultFetchEncryptedJson = async (url, payload, {
  fetchImpl = fetch,
  randomBytesImpl = randomBytes,
} = {}) =>
  withRetry(async () => {
    const request = buildEncryptedRequest(payload, {
      randomBytesImpl,
    })
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
      signal: createTimeoutSignal(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }

    const rawJson = await response.json()
    return {
      status: response.status,
      url,
      json: decryptEncryptedResponse(rawJson, response.headers),
    }
  }, {
    attempts: 3,
    baseDelayMs: 2000,
    label: 'moglix-encrypted-json',
  })

export const createMoglixScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    fetchEncryptedJson = defaultFetchEncryptedJson,
  } = {}) {
    const careersPage = await fetchPage(OFFICIAL_CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersPage?.html)) {
      throw new Error('Moglix official careers page no longer exposes the verified public jobs handoff')
    }

    const careerSectionConfig = await fetchEncryptedJson(
      CAREER_SECTION_CONFIG_URL,
      createCareerSectionConfigPayload(),
    )
    const careerSectionRow = extractCareerSectionRow(careerSectionConfig?.json)
    if (
      !careerSectionRow
      || normalizeWhitespace(careerSectionRow.site_url) !== EXPECTED_SITE_URL
      || normalizeWhitespace(careerSectionRow.site_name) !== EXPECTED_SITE_NAME
      || Number(careerSectionRow.active) !== 1
    ) {
      throw new Error('Moglix career section configuration no longer matches the verified public jobs site')
    }

    const gridDefinition = await fetchJson(GRID_DEFINITION_URL)
    if (!hasExpectedGridSchema(gridDefinition?.json)) {
      throw new Error('Moglix grid schema no longer matches the verified public jobs contract')
    }

    const jobsResponse = await fetchEncryptedJson(
      JOBS_API_URL,
      createJobsListPayload(),
    )
    if (!Array.isArray(jobsResponse?.json?.data?.rows)) {
      throw new Error('Moglix jobs feed no longer matches the verified public API payload')
    }

    const jobs = extractSearchResults(jobsResponse.json)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async () => createMoglixScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
