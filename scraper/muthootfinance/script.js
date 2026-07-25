import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

import { createOptimizedPage, launchBrowser } from '../utils/browser.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://www.muthootfinance.com/'
export const CAREERS_URL = 'https://www.muthootfinance.com/careers'
export const SOUTH_INDIA_PORTAL_URL = 'https://career.muthootfinance.com/'
export const SOUTH_INDIA_JOB_POSTS_URL =
  'https://career.muthootfinance.com/Pages/CareerPortal/frmCommonMethods.aspx/getJobPosts'
export const SOUTH_INDIA_COMPANY_IDS = [1, 20]

const COMPANY = 'Muthoot Finance'
const SOURCE = 'muthootfinance'
const COMPANY_DOMAIN = 'muthootfinance.com'
const ATS_PLATFORM = 'official-company-careers'
const MARKETING_APPLY_EMAIL = 'hrdelhi4@muthootgroup.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const MARKETING_DESCRIPTION = [
  'Regional marketing leadership role covering BTL execution and social media creative support.',
  'Essential qualification: Graduation (Regular).',
  'Preferred qualification: MBA / PGDM - Marketing.',
  'Experience: 2+ year in Marketing (Sales experience is not considerable).',
  'Last date: Open until we find the right candidate.',
].join(' ')

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(value)
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeMultilineText = (value) => String(value ?? '')
  .replace(/\r/g, '')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)
  .join('\n')

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/section|\/article|\/ul|\/ol|\/h[1-6]|\/span)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|section|article|ul|ol|h[1-6]|span)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const buildAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const toTitleCase = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/\b[a-z]/g, (character) => character.toUpperCase()) || null

const attachmentKindFromUrl = (url) => {
  const normalized = String(url ?? '').toLowerCase()
  if (normalized.endsWith('.docx')) return 'trainer'
  if (normalized.endsWith('.pdf')) return 'regional-pdf'
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'marketing'
  return 'unknown'
}

const normalizeScrapedAt = (value) => {
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

const formatSouthIndiaPortalDate = (value) => {
  const date = new Date(value)
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date
  const month = String(validDate.getMonth() + 1).padStart(2, '0')
  const day = String(validDate.getDate()).padStart(2, '0')
  return `${month}/${day}/${validDate.getFullYear()}`
}

const parseUsDateString = (value) => {
  const match = String(value ?? '').match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (!match) return null

  const [, month, day, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const buildBaseJob = ({
  title,
  location,
  city = null,
  sourceUrl,
  applyUrl,
  jobDescription,
  scrapedAt,
  jobIdSuffix,
  department = null,
  employmentType = null,
  experienceRequired = null,
  minimumQualification = null,
  preferredQualification = null,
}) => ({
  title,
  company: COMPANY,
  department,
  location,
  city,
  country: 'India',
  jobId: `${SOURCE}-${jobIdSuffix}`,
  requisitionId: `${SOURCE}-${jobIdSuffix}`,
  sourceUrl,
  applyUrl,
  employmentType,
  experienceRequired,
  minimumQualification,
  preferredQualification,
  requiredSkills: [],
  postingDate: null,
  closingDate: null,
  jobDescription,
  remoteStatus: 'On-site',
  companyCareerPage: CAREERS_URL,
  companyDomain: COMPANY_DOMAIN,
  atsPlatform: ATS_PLATFORM,
  source: SOURCE,
  link: applyUrl || sourceUrl,
  scrapedAt,
})

export const pageIndicatesOfficialHomepage = (html) => {
  const page = String(html ?? '')

  return /muthoot\s+finance/i.test(page)
    && /largest\s+gold\s+loan/i.test(page)
    && /careers/i.test(page)
}

export const pageIndicatesOfficialCareersSurface = (html) => {
  const page = String(html ?? '')

  return /career\s+opportunity\s*@\s*muthoot\s+finance/i.test(page)
    && /current\s+openings/i.test(page)
    && /vacancies/i.test(page)
    && /fraudulent\s+recruitment\s+offers/i.test(page)
}

export const extractAttachmentRows = (html) => {
  if (!pageIndicatesOfficialCareersSurface(html)) {
    throw new Error('Muthoot Finance careers page no longer matches the verified official public jobs surface')
  }

  const page = String(html ?? '')
  const southIndiaMatch = page.match(
    /<option\b[^>]*value="([^"]+)"[^>]*>\s*CURRENT OPENINGS SOUTH INDIA\s*<\/option>/i,
  )

  const southIndiaUrl = buildAbsoluteUrl(southIndiaMatch?.[1], CAREERS_URL)
  const entries = [...page.matchAll(
    /<li\b[^>]*>\s*<div\b[^>]*class="[^"]*\blbl\b[^"]*"[\s\S]*?<p>\s*([^<]+?)\s*<\/p>[\s\S]*?<a\b[^>]*href="([^"]+)"[^>]*>/gi,
  )]
    .map((match) => ({
      label: normalizeWhitespace(stripTags(match[1])),
      attachmentUrl: buildAbsoluteUrl(match[2], CAREERS_URL),
    }))
    .filter((entry) => entry.label && entry.attachmentUrl)

  return {
    southIndiaUrl,
    entries,
  }
}

export const extractDocxMainDocumentXml = (buffer) => {
  const zipBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)

  for (let offset = 0; offset + 30 <= zipBuffer.length; ) {
    const signature = zipBuffer.readUInt32LE(offset)

    if (signature === 0x04034b50) {
      const compressionMethod = zipBuffer.readUInt16LE(offset + 8)
      const compressedSize = zipBuffer.readUInt32LE(offset + 18)
      const fileNameLength = zipBuffer.readUInt16LE(offset + 26)
      const extraFieldLength = zipBuffer.readUInt16LE(offset + 28)
      const fileNameStart = offset + 30
      const fileNameEnd = fileNameStart + fileNameLength
      const fileName = zipBuffer.toString('utf8', fileNameStart, fileNameEnd)
      const dataStart = fileNameEnd + extraFieldLength
      const dataEnd = dataStart + compressedSize

      if (fileName === 'word/document.xml') {
        const compressed = zipBuffer.subarray(dataStart, dataEnd)
        if (compressionMethod === 0) return compressed.toString('utf8')
        if (compressionMethod === 8) return zlib.inflateRawSync(compressed).toString('utf8')
        throw new Error(`Unsupported DOCX compression method: ${compressionMethod}`)
      }

      offset = dataEnd
      continue
    }

    if (signature === 0x02014b50 || signature === 0x06054b50) break
    offset += 1
  }

  throw new Error('word/document.xml not found in DOCX buffer')
}

const extractWordParagraphs = (xml) => [...String(xml ?? '').matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi)]
  .map((match) => normalizeWhitespace(
    decodeHtml(
      [...match[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)]
        .map((textMatch) => textMatch[1])
        .join(''),
    ).replace(/([A-Za-z])\(/g, '$1 ('),
  ))
  .filter(Boolean)

export const parseRegionalTrainerDocumentXml = (xml) => {
  const paragraphs = extractWordParagraphs(xml)
  const title = paragraphs[0] || null
  const locationsIndex = paragraphs.findIndex((paragraph) => /^locations$/i.test(paragraph))
  const locations = locationsIndex >= 0
    ? (paragraphs[locationsIndex + 1] || '')
      .split(/\s*\/\s*/)
      .map((value) => normalizeWhitespace(value))
      .filter(Boolean)
    : []

  const jobDescriptionParagraphs = paragraphs.slice(2, locationsIndex >= 0 ? locationsIndex : undefined)

  return {
    title,
    jobDescription: jobDescriptionParagraphs.join('\n'),
    locations,
  }
}

const decodePdfLiteralString = (value) => {
  let decoded = ''

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character !== '\\') {
      decoded += character
      continue
    }

    const nextCharacter = value[index + 1]
    if (nextCharacter == null) break

    if (/[0-7]/.test(nextCharacter)) {
      let octal = nextCharacter
      index += 1
      for (let octalIndex = 0; octalIndex < 2; octalIndex += 1) {
        const peek = value[index + 1]
        if (peek == null || !/[0-7]/.test(peek)) break
        octal += peek
        index += 1
      }
      decoded += String.fromCharCode(Number.parseInt(octal, 8))
      continue
    }

    switch (nextCharacter) {
      case 'n':
        decoded += '\n'
        break
      case 'r':
        decoded += '\r'
        break
      case 't':
        decoded += '\t'
        break
      case 'b':
        decoded += '\b'
        break
      case 'f':
        decoded += '\f'
        break
      default:
        decoded += nextCharacter
        break
    }

    index += 1
  }

  return decoded
}

const decodePdfHexString = (value) => {
  const normalized = value.replace(/\s+/g, '')
  if (!normalized) return ''

  const evenLength = normalized.length % 2 === 0 ? normalized : `${normalized}0`
  return Buffer.from(evenLength, 'hex').toString('latin1')
}

const extractPdfStringsFromArray = (value) => [...String(value ?? '').matchAll(/(\((?:\\.|[^\\)])*\)|<[0-9a-fA-F\s]+>)/g)]
  .map((match) => {
    const token = match[1]
    if (token.startsWith('(')) return decodePdfLiteralString(token.slice(1, -1))
    return decodePdfHexString(token.slice(1, -1))
  })
  .map((item) => normalizeWhitespace(item))
  .filter(Boolean)

const extractTextFromPdfStream = (value) => {
  const lines = []
  const streamText = String(value ?? '')

  for (const match of streamText.matchAll(/(\((?:\\.|[^\\)])*\)|<[0-9a-fA-F\s]+>)\s*Tj\b/g)) {
    const token = match[1]
    const decoded = token.startsWith('(')
      ? decodePdfLiteralString(token.slice(1, -1))
      : decodePdfHexString(token.slice(1, -1))
    const normalized = normalizeWhitespace(decoded)
    if (normalized) lines.push(normalized)
  }

  for (const match of streamText.matchAll(/\[((?:[\s\S]*?))\]\s*TJ\b/g)) {
    const normalized = normalizeWhitespace(extractPdfStringsFromArray(match[1]).join(' '))
    if (normalized) lines.push(normalized)
  }

  if (lines.length > 0) return lines.join('\n')

  return extractPdfStringsFromArray(streamText).join('\n')
}

export const extractPdfTextFromBuffer = (buffer) => {
  const pdfBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const pdfText = pdfBuffer.toString('latin1')
  const extractedStreams = []

  for (const match of pdfText.matchAll(
    /<<(?:[\s\S]*?)\/Filter\s*\/FlateDecode(?:[\s\S]*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/gi,
  )) {
    const compressed = Buffer.from(match[1], 'latin1')

    try {
      extractedStreams.push(zlib.inflateSync(compressed).toString('latin1'))
    } catch {
      extractedStreams.push(zlib.inflateRawSync(compressed).toString('latin1'))
    }
  }

  if (extractedStreams.length === 0) {
    throw new Error('No FlateDecode stream found in PDF buffer')
  }

  return normalizeMultilineText(
    extractedStreams
      .map((stream) => extractTextFromPdfStream(stream))
      .filter(Boolean)
      .join('\n'),
  )
}

export const parseAhmedabadRegionalPdfText = (text, { attachmentUrl = null } = {}) => {
  const normalizedText = normalizeMultilineText(text)
  const email = normalizedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() || null
  const applyUrl = email ? `mailto:${email}` : attachmentUrl
  const region = toTitleCase(normalizedText.match(/Region\s*:\s*([^\n]+)/i)?.[1] || 'Ahmedabad')
  const hasGujaratSignal = /gujarat/i.test(normalizedText)
  const location = `${region} Region${hasGujaratSignal ? ', Gujarat' : ''}, India`
  const jobs = []

  if (
    /branch\s+head/i.test(normalizedText)
    && /branch\s+manager/i.test(normalizedText)
    && /asst\.?\s*branch\s+manager/i.test(normalizedText)
  ) {
    jobs.push({
      title: 'Branch Head / Branch Manager / Assistant Branch Manager',
      location,
      city: region,
      sourceUrl: attachmentUrl,
      applyUrl,
      jobDescription: normalizedText,
    })
  }

  if (/relationship\s+executives/i.test(normalizedText)) {
    jobs.push({
      title: 'Relationship Executives',
      location,
      city: region,
      sourceUrl: attachmentUrl,
      applyUrl,
      jobDescription: normalizedText,
    })
  }

  if (/customer\s+care\s+executives/i.test(normalizedText)) {
    jobs.push({
      title: 'Customer Care Executives',
      location,
      city: region,
      sourceUrl: attachmentUrl,
      applyUrl,
      jobDescription: normalizedText,
    })
  }

  return jobs
}

const createBrowserFetchSession = async ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const page = await createOptimizedPageImpl(browser)

    return {
      close: async () => browser.close(),
      fetchText: async (url) => {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        })

        if (!response?.ok()) {
          throw new Error(`HTTP ${response?.status?.() ?? 'unknown'} for ${url}`)
        }

        return page.content()
      },
      fetchBinary: async (url) => {
        const bytes = await page.evaluate(async (targetUrl) => {
          const response = await fetch(targetUrl, { credentials: 'include' })
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${targetUrl}`)
          }

          return Array.from(new Uint8Array(await response.arrayBuffer()))
        }, url)

        return Buffer.from(bytes)
      },
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchBinary = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: '*/*',
    },
    signal: typeof AbortSignal?.timeout === 'function'
      ? AbortSignal.timeout(15000)
      : undefined,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

const defaultProbeSouthIndiaPortal = async () => {
  try {
    const response = await fetch(SOUTH_INDIA_PORTAL_URL, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: typeof AbortSignal?.timeout === 'function'
        ? AbortSignal.timeout(8000)
        : undefined,
    })

    return response.status >= 200 && response.status < 500
  } catch {
    return false
  }
}

const extractRowsFromSouthIndiaPayload = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.d?.ResultSet)) return payload.d.ResultSet
  if (Array.isArray(payload?.ResultSet)) return payload.ResultSet
  return []
}

const fetchSouthIndiaJobPostsForCompany = async ({ date, companyId }) => {
  const response = await fetch(SOUTH_INDIA_JOB_POSTS_URL, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/json; charset=utf-8',
      Origin: SOUTH_INDIA_PORTAL_URL.replace(/\/$/, ''),
      Referer: `${SOUTH_INDIA_PORTAL_URL}Pages/CareerPortal/frmApplicantJobSearch.aspx`,
    },
    body: JSON.stringify({
      jobId: 0,
      jobCode: null,
      jobTitle: null,
      stateId: '',
      districtId: '',
      openingDate: date,
      closingDate: date,
      userType: 0,
      userId: 0,
      pageIndex: 1,
      rowsPerPage: 1000,
      sortOrder: 'DESC',
      sortColumn: 'JOB_POST_ID',
      CompanyId: companyId,
    }),
    signal: typeof AbortSignal?.timeout === 'function'
      ? AbortSignal.timeout(15000)
      : undefined,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${SOUTH_INDIA_JOB_POSTS_URL}`)
  }

  return extractRowsFromSouthIndiaPayload(await response.json())
}

const defaultFetchSouthIndiaJobPosts = async ({ date }) => {
  const rows = []
  for (const companyId of SOUTH_INDIA_COMPANY_IDS) {
    rows.push(...await fetchSouthIndiaJobPostsForCompany({ date, companyId }))
  }
  return rows
}

const normalizePortalTitle = (value) => toTitleCase(value)
const normalizePortalCity = (row) => toTitleCase(row.JOB_LOCATION || row.DISTRICT_NAME || row.STATE_NAME)
const normalizePortalState = (row) => toTitleCase(row.STATE_NAME)

const normalizeExperienceRange = (fromValue, toValue) => {
  const from = normalizeWhitespace(fromValue)
  const to = normalizeWhitespace(toValue)

  if (from && to) return from === to ? `${from} years` : `${from}-${to} years`
  if (from) return `${from}+ years`
  if (to) return `Up to ${to} years`
  return null
}

export const extractSouthIndiaPortalJobs = (payload, { scrapedAt = new Date().toISOString() } = {}) =>
  extractRowsFromSouthIndiaPayload(payload).map((row) => {
    const jobPostId = normalizeWhitespace(row.JOB_POST_ID)
    const title = normalizePortalTitle(row.JOB_POST_NAME)
    if (!jobPostId || !title || /^general$/i.test(title)) return null

    const city = normalizePortalCity(row)
    const state = normalizePortalState(row)
    const location = [city, state, 'India']
      .filter((part, index, values) => part && values.indexOf(part) === index)
      .join(', ')
    const description = stripTags(row.JOB_DESCRIPTION) || title
    const vacancies = Number.parseInt(row.NO_OF_VACANCIES, 10)

    return {
      ...buildBaseJob({
        title,
        location: location || 'India',
        city,
        sourceUrl: SOUTH_INDIA_JOB_POSTS_URL,
        applyUrl: SOUTH_INDIA_PORTAL_URL,
        jobDescription: description,
        scrapedAt,
        jobIdSuffix: `south-${jobPostId}`,
        experienceRequired: normalizeExperienceRange(row.EXPERIENCE_FROM, row.EXPERIENCE_TO),
      }),
      requisitionId: normalizeWhitespace(row.JOB_POST_CODE) || `south-${jobPostId}`,
      postingDate: parseUsDateString(row.OPEN_DATE),
      closingDate: parseUsDateString(row.CLOSE_DATE),
      vacancies: Number.isNaN(vacancies) ? null : vacancies,
    }
  }).filter(Boolean)

const createTrainerJobs = ({ entries, trainerProfile, scrapedAt }) => entries.map((entry) => {
  const rawLocation = entry.label.replace(/\s*-\s*HR TRAINER\s*$/i, '')
  const location = `${toTitleCase(rawLocation)}, India`
  const jobIdSuffix = slugify(`trainer-${rawLocation}-${entry.attachmentUrl}`)

  return buildBaseJob({
    title: trainerProfile.title,
    location,
    city: toTitleCase(rawLocation),
    sourceUrl: entry.attachmentUrl,
    applyUrl: entry.attachmentUrl,
    jobDescription: trainerProfile.jobDescription,
    scrapedAt,
    jobIdSuffix,
    department: 'Human Resources',
    experienceRequired: '3-5 years of experience in preferably in BFSI sector',
  })
})

const createMarketingJobs = ({ entries, scrapedAt }) => entries.map((entry) => {
  const city = toTitleCase(entry.label)
  const jobIdSuffix = slugify(`marketing-${entry.label}-${entry.attachmentUrl}`)

  return buildBaseJob({
    title: 'Regional Marketing Manager / BTL Manager',
    location: `${city}, India`,
    city,
    sourceUrl: entry.attachmentUrl,
    applyUrl: `mailto:${MARKETING_APPLY_EMAIL}`,
    jobDescription: MARKETING_DESCRIPTION,
    scrapedAt,
    jobIdSuffix,
    department: 'Marketing',
    experienceRequired: '2+ year in Marketing (Sales experience is not considerable)',
    minimumQualification: 'Graduation (Regular)',
    preferredQualification: 'MBA / PGDM - Marketing',
  })
})

const createRegionalPdfJobs = ({ jobs, scrapedAt }) => jobs.map((job) => buildBaseJob({
  title: job.title,
  location: job.location,
  city: job.city,
  sourceUrl: job.sourceUrl,
  applyUrl: job.applyUrl,
  jobDescription: job.jobDescription,
  scrapedAt,
  jobIdSuffix: slugify(`regional-pdf-${job.title}-${job.sourceUrl}`),
  department: 'Branch Operations',
}))

export const createMuthootFinanceScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText,
    fetchBinary,
    probeSouthIndiaPortal = defaultProbeSouthIndiaPortal,
    fetchSouthIndiaJobPosts = defaultFetchSouthIndiaJobPosts,
    createBrowserFetchSessionImpl = createBrowserFetchSession,
  } = {}) {
    let browserSession = null

    try {
      if (!fetchText || !fetchBinary) {
        try {
          browserSession = await createBrowserFetchSessionImpl()
        } catch {
          browserSession = null
        }
      }

      fetchText = fetchText || browserSession?.fetchText || defaultFetchText
      fetchBinary = fetchBinary || browserSession?.fetchBinary || defaultFetchBinary

      const homepageHtml = await fetchText(HOMEPAGE_URL)
      if (!pageIndicatesOfficialHomepage(homepageHtml)) {
        throw new Error('Muthoot Finance homepage no longer matches the verified official public site')
      }

      const careersHtml = await fetchText(CAREERS_URL)
      const { southIndiaUrl, entries } = extractAttachmentRows(careersHtml)

      if (southIndiaUrl !== SOUTH_INDIA_PORTAL_URL) {
        throw new Error('Muthoot Finance careers handoff changed materially from the verified South India portal URL')
      }

      const southIndiaPortalReachable = await probeSouthIndiaPortal(southIndiaUrl)

      if (entries.length === 0) {
        throw new Error('Muthoot Finance careers page no longer exposes the verified attachment-backed vacancies list')
      }

      const trainerEntries = entries.filter((entry) => attachmentKindFromUrl(entry.attachmentUrl) === 'trainer')
      const marketingEntries = entries.filter((entry) => attachmentKindFromUrl(entry.attachmentUrl) === 'marketing')
      const pdfEntries = entries.filter((entry) => attachmentKindFromUrl(entry.attachmentUrl) === 'regional-pdf')

      const trainerDocumentBuffer = trainerEntries.length > 0
        ? await fetchBinary(trainerEntries[0].attachmentUrl)
        : null
      const trainerProfile = trainerDocumentBuffer
        ? parseRegionalTrainerDocumentXml(extractDocxMainDocumentXml(trainerDocumentBuffer))
        : null

      const regionalPdfBuffer = pdfEntries.length > 0
        ? await fetchBinary(pdfEntries[0].attachmentUrl)
        : null
      const regionalPdfJobs = regionalPdfBuffer
        ? parseAhmedabadRegionalPdfText(extractPdfTextFromBuffer(regionalPdfBuffer), {
          attachmentUrl: pdfEntries[0].attachmentUrl,
        })
        : []

      if (!trainerProfile?.title) {
        throw new Error('Muthoot Finance regional trainer attachment no longer matches the verified trainer document structure')
      }

      const scrapedAt = normalizeScrapedAt(now())
      const southIndiaJobs = southIndiaPortalReachable
        ? extractSouthIndiaPortalJobs(await fetchSouthIndiaJobPosts({
          date: formatSouthIndiaPortalDate(scrapedAt),
        }), { scrapedAt })
        : []

      return [
        ...createTrainerJobs({ entries: trainerEntries, trainerProfile, scrapedAt }),
        ...createMarketingJobs({ entries: marketingEntries, scrapedAt }),
        ...createRegionalPdfJobs({ jobs: regionalPdfJobs, scrapedAt }),
        ...southIndiaJobs,
      ]
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createMuthootFinanceScraper(options).run(options)

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
