import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'suryoday'
export const COMPANY = 'Suryoday'
export const COMPANY_DOMAIN = 'suryoday.bank.in'
export const CAREERS_URL = 'https://suryoday.bank.in/careers/'
export const JOBS_BOARD_URL = 'https://suryoday.workline.hr/Candidate/GeneralOpening.aspx?Flag=C'
export const ATS_PLATFORM = 'workline-public-general-openings-table'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTagsToText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|button|a|td|th|tr|table)>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeField = (value) => normalizeWhitespace(value) || null

const uniqueParts = (parts) => {
  const seen = new Set()
  const output = []

  for (const value of parts) {
    const normalized = normalizeField(value)
    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    output.push(normalized)
  }

  return output
}

const toAbsoluteUrl = (value, baseUrl = JOBS_BOARD_URL) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value), baseUrl).toString()
  } catch {
    return null
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const extractListingTableHtml = (html = '') => String(html).match(
  /<table\b[^>]*id=["']openpositions["'][^>]*>[\s\S]*?<\/table>/i,
)?.[0] ?? null

const extractTableBodyHtml = (html = '') => extractListingTableHtml(html)?.match(
  /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i,
)?.[1] ?? null

const extractCells = (rowHtml = '') => Array.from(
  String(rowHtml).matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi),
  ([, cellHtml]) => cellHtml,
)

const extractApplyUrl = (cellHtml = '') => toAbsoluteUrl(
  String(cellHtml).match(
    /<a\b[^>]*href=["']([^"']*CanPRFApplyBL\.aspx\?[^"']*PRFCode=[^"']*Flag=C[^"']*)["']/i,
  )?.[1],
)

const buildLocation = (row = {}) => {
  const parts = uniqueParts([row.locationName, 'India'])
  return parts.length > 0 ? parts.join(', ') : 'India'
}

const buildJobDescription = (row = {}) => [
  normalizeField(row.referenceNumber)
    ? `Reference No.: ${normalizeField(row.referenceNumber)}`
    : null,
  normalizeField(row.product)
    ? `Product: ${normalizeField(row.product)}`
    : null,
  normalizeField(row.functionName)
    ? `Function: ${normalizeField(row.functionName)}`
    : null,
  normalizeField(row.locationName)
    ? `Location: ${normalizeField(row.locationName)}`
    : null,
].filter(Boolean).join('\n') || null

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)

  return /Shape your career with a growing Bank/i.test(text)
    && /Browse open positions/i.test(text)
    && /Explore Open Positions/i.test(text)
    && /href=["']https:\/\/suryoday\.workline\.hr\/Candidate\/GeneralOpening\.aspx\?Flag=C["'][^>]*>\s*Find the right-fit job role for you\s*<\/a>/i.test(page)
}

export const extractJobsBoardUrl = (html = '') => String(html ?? '').match(
  /href=["'](https:\/\/suryoday\.workline\.hr\/Candidate\/GeneralOpening\.aspx\?Flag=C)["'][^>]*>\s*Find the right-fit job role for you\s*<\/a>/i,
)?.[1] ?? null

export const hasOfficialJobsBoardSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)

  return /<title>\s*Suryoday - Workline - Possibilities Infinite\s*<\/title>/i.test(page)
    && /General Openings/i.test(text)
    && /<table\b[^>]*id=["']openpositions["']/i.test(page)
    && /Reference No\./i.test(text)
    && /\bPosition\b/i.test(text)
    && /\bProduct\b/i.test(text)
    && /\bFunction\b/i.test(text)
    && /\bLocation\b/i.test(text)
    && /\bAction\b/i.test(text)
}

export const hasVerifiedListingTableContract = (html = '') => {
  const tbodyHtml = extractTableBodyHtml(html)

  return Boolean(
    tbodyHtml
    && /<tr\b/i.test(tbodyHtml)
    && /CanPRFApplyBL\.aspx\?PRFCode=/i.test(tbodyHtml),
  )
}

export const extractListingRows = (html = '') => {
  if (!hasVerifiedListingTableContract(html)) {
    throw new Error('Suryoday verified Workline listing table no longer matches the known public contract')
  }

  const rows = Array.from(
    extractTableBodyHtml(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi),
    ([, rowHtml]) => rowHtml,
  )

  return rows.map((rowHtml) => {
    const cells = extractCells(rowHtml)
    if (cells.length < 6) return null

    const applyUrl = extractApplyUrl(cells[5])
    if (!applyUrl) return null

    const referenceNumber = normalizeField(stripTagsToText(cells[0]))
    const title = normalizeField(stripTagsToText(cells[1]))
    if (!referenceNumber || !title) return null

    return {
      referenceNumber,
      title,
      product: normalizeField(stripTagsToText(cells[2])),
      functionName: normalizeField(stripTagsToText(cells[3])),
      locationName: normalizeField(stripTagsToText(cells[4])),
      applyUrl,
    }
  }).filter(Boolean)
}

export const mapListingRowToJob = (row, { scrapedAt = new Date().toISOString() } = {}) => {
  const referenceNumber = normalizeField(row?.referenceNumber)
  const title = normalizeField(row?.title)
  const applyUrl = normalizeField(row?.applyUrl)

  if (!referenceNumber || !title || !applyUrl) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department: normalizeField(row?.functionName) || normalizeField(row?.product),
    location: buildLocation(row),
    city: normalizeField(row?.locationName),
    country: 'India',
    sourceUrl: applyUrl,
    applyUrl,
    jobId: `${SOURCE}-${referenceNumber}`,
    requisitionId: referenceNumber,
    employmentType: null,
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: buildJobDescription(row),
    source: SOURCE,
    companyCareerPage: CAREERS_URL,
    companyDomain: COMPANY_DOMAIN,
    atsPlatform: ATS_PLATFORM,
    link: applyUrl,
    scrapedAt,
  }
}

export const createSuryodayScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (
      careersPage.status !== 200
      || careersPage.url !== CAREERS_URL
      || !hasOfficialCareersSignal(careersPage.html)
      || extractJobsBoardUrl(careersPage.html) !== JOBS_BOARD_URL
    ) {
      return []
    }

    const jobsBoard = await fetchPage(JOBS_BOARD_URL)
    if (
      jobsBoard.status !== 200
      || jobsBoard.url !== JOBS_BOARD_URL
      || !hasOfficialJobsBoardSignal(jobsBoard.html)
      || !hasVerifiedListingTableContract(jobsBoard.html)
    ) {
      return []
    }

    const scrapedAt = now()

    return extractListingRows(jobsBoard.html)
      .map((row) => mapListingRowToJob(row, { scrapedAt }))
      .filter(Boolean)
  },
})

export const run = async (options = {}) => createSuryodayScraper().run(options)

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
