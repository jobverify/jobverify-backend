import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'indiamart'
export const COMPANY = 'IndiaMART'
export const OFFICIAL_BRAND_NAME = 'IndiaMART InterMESH Ltd.'
export const VERIFIED_ON = '2026-07-16'
export const CAREERS_HOMEPAGE_URL = 'https://careers.indiamart.com/'
export const LEADERSHIP_JOBS_PAGE_URL =
  'https://careers.indiamart.com/leadership-product-tech-corporate-roles.html'
export const JOBS_BOARD_URL = 'https://joblist.klimb.io/indiamart'
export const KLIMB_CUSTOMER_ID = '5dd7966c6c4d197f68105048'
export const PROVIDER_METADATA = {
  source: SOURCE,
  companyCareerPage: CAREERS_HOMEPAGE_URL,
}

const JOBS_BOARD_ORIGIN = 'https://joblist.klimb.io'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) =>
  String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const stripHtml = (value) => decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' '))

const normalizeWhitespace = (value) => {
  const normalized = stripHtml(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized || null
}

const buildDetailUrl = (jobId) => `${JOBS_BOARD_URL}/${jobId}?source=careers`
const buildApplyUrl = (jobId) => `${JOBS_BOARD_URL}/${jobId}/apply?source=careers`

const normalizeExperienceRange = (minimum, maximum) => {
  const min = normalizeWhitespace(minimum)
  const max = normalizeWhitespace(maximum)
  if (min && max) return `${min}-${max} years`
  if (min) return `${min}+ years`
  if (max) return `Up to ${max} years`
  return null
}

const getAddressComponent = (location = {}, type) =>
  location?.gPlace?.address_components?.find((component) => Array.isArray(component?.types) && component.types.includes(type))
    ?.long_name
  || null

const normalizeLocationFromPosition = (position = {}) => {
  if (position.remote) {
    return {
      location: 'Remote',
      city: null,
      state: null,
      country: null,
      remoteStatus: 'Remote',
    }
  }

  const location = normalizeWhitespace(
    position.location?.gPlace?.formatted_address || position.location?.searchText,
  )
  const city = normalizeWhitespace(getAddressComponent(position.location, 'locality'))
    || normalizeWhitespace(location?.split(',')[0])
  const state = normalizeWhitespace(getAddressComponent(position.location, 'administrative_area_level_1'))
  const country = normalizeWhitespace(getAddressComponent(position.location, 'country'))

  return {
    location,
    city,
    state,
    country,
    remoteStatus: 'On-site',
  }
}

const buildJobFromCardBlock = (block) => {
  const department = normalizeWhitespace(
    block.match(/data-template-department="([^"]*)"/i)?.[1],
  )
  const locationToken = normalizeWhitespace(
    block.match(/data-template-locaName="([^"]*)"/i)?.[1],
  )
  const jobId = normalizeWhitespace(
    block.match(/redirectToPage\('\/indiamart\/([^\/?'"]+)\?source=careers'\)/i)?.[1],
  )
  const title = normalizeWhitespace(
    block.match(/<div class="role-new role">([\s\S]*?)<\/div>/i)?.[1],
  )
  const listItems = [...block.matchAll(/<li[^>]*class="info list-inline-item">([\s\S]*?)<\/li>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)
  const description = normalizeWhitespace(
    block.match(/<div class="current-opening-desc"[^>]*>([\s\S]*?)<\/div>/i)?.[1],
  )

  if (!jobId || !title || !locationToken) {
    return null
  }

  const remote = /remote/i.test(locationToken)
  const city = remote ? null : locationToken
  const country = remote ? null : 'India'
  const location = remote ? 'Remote' : `${locationToken}, India`

  return {
    title,
    company: COMPANY,
    department,
    location,
    city,
    state: null,
    country,
    jobId,
    requisitionId: jobId,
    sourceUrl: buildDetailUrl(jobId),
    applyUrl: buildApplyUrl(jobId),
    employmentType: null,
    experienceRequired: listItems[1] || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: description,
    remoteStatus: remote ? 'Remote' : 'On-site',
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /IndiaMART InterMESH Ltd/i.test(page)
    && /field-sales-and-servicing\.html/i.test(page)
    && /tele-sales-and-servicing\.html/i.test(page)
    && /leadership-product-tech-corporate-roles\.html/i.test(page)
    && /imerp\.intermesh\.net\/im-job-application\/auth\/jobid\/MjIx/i.test(page)
}

export const hasOfficialLeadershipJobsPageSignal = (html) => {
  const page = String(html ?? '')

  return /Leadership\s*\/\s*Product\s*\/\s*Tech\s*&amp;\s*Corporate Roles/i.test(page)
    && /joblist\.klimb\.io\/js\/embedscripts\/embed\.js/i.test(page)
    && /klimb_init\(\s*\{[\s\S]*company\s*:\s*"indiamart"/i.test(page)
    && /id="klimbjobs"/i.test(page)
}

export const hasOfficialJobsBoardSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*IndiaMART InterMESH Ltd\.\s*Careers\s*<\/title>/i.test(page)
    && new RegExp(`getFilterContent\\('${KLIMB_CUSTOMER_ID}','indiamart','true','careers'\\)`, 'i').test(page)
    && new RegExp(`<input[^>]+id="cusId"[^>]+value="${KLIMB_CUSTOMER_ID}"`, 'i').test(page)
    && /Jobs at IndiaMART InterMESH Ltd\./i.test(page)
}

export const extractLoadMoreCursor = (html) =>
  normalizeWhitespace(
    String(html ?? '').match(/loadMoreJobs\('careers','([^']+)'\)/i)?.[1],
  )

export const extractInitialBoardJobs = (html) => {
  const page = String(html ?? '')
  const blocks = page.split(/<div\b(?=[^>]*data-template-department=)/i).slice(1)

  return blocks
    .map((block) => buildJobFromCardBlock(`<div${block}`))
    .filter(Boolean)
}

export const extractPaginatedJobs = (payload) =>
  (Array.isArray(payload?.jobs?.positions) ? payload.jobs.positions : [])
    .map((position) => {
      const title = normalizeWhitespace(position.title)
      const jobId = normalizeWhitespace(position.id)
      const { location, city, state, country, remoteStatus } = normalizeLocationFromPosition(position)

      if (!title || !jobId || !location) {
        return null
      }

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(position.department),
        location,
        city,
        state,
        country,
        jobId,
        requisitionId: jobId,
        sourceUrl: buildDetailUrl(jobId),
        applyUrl: buildApplyUrl(jobId),
        employmentType: null,
        experienceRequired: normalizeExperienceRange(
          position.expRange?.minimum,
          position.expRange?.maximum,
        ),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: normalizeWhitespace(position.description),
        remoteStatus,
      }
    })
    .filter(Boolean)

export const hasVerifiedJobDetailPage = (page = {}, job = {}) => {
  if (Number(page.status) !== 200) {
    return false
  }

  const html = String(page.html ?? '')
  const normalizedHtml = normalizeWhitespace(html)?.toLowerCase() || ''
  const normalizedTitle = normalizeWhitespace(job.title)?.toLowerCase() || ''

  return normalizedHtml.includes(normalizedTitle)
    && normalizedHtml.includes(OFFICIAL_BRAND_NAME.toLowerCase())
    && new RegExp(`data-position="${job.jobId}"`, 'i').test(html)
    && new RegExp(`/indiamart/${job.jobId}/apply\\?source=careers`, 'i').test(html)
    && /JobPosting/i.test(html)
}

const defaultFetchPage = async (url) => {
  const html = await fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

  return { status: 200, url, html }
}

const defaultFetchJson = (url) =>
  fetchJsonWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

export const createIndiaMartScraper = ({
  maxJobs = null,
  maxPages = 25,
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepage = await fetchPage(CAREERS_HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Official IndiaMART careers homepage no longer matches the verified surface')
    }

    const leadershipPage = await fetchPage(LEADERSHIP_JOBS_PAGE_URL)
    if (leadershipPage.status !== 200 || !hasOfficialLeadershipJobsPageSignal(leadershipPage.html)) {
      throw new Error('IndiaMART official leadership jobs page no longer matches the verified surface')
    }

    const boardPage = await fetchPage(JOBS_BOARD_URL)
    if (boardPage.status !== 200 || !hasOfficialJobsBoardSignal(boardPage.html)) {
      throw new Error('The public IndiaMART Klimb board no longer matches the verified surface')
    }

    const jobs = []
    const seenJobIds = new Set()
    const addJobs = (items = []) => {
      for (const item of items) {
        if (!item || !item.jobId || seenJobIds.has(item.jobId)) continue
        seenJobIds.add(item.jobId)
        jobs.push(item)
      }
    }

    addJobs(extractInitialBoardJobs(boardPage.html))
    if (jobs.length === 0) {
      throw new Error('No public IndiaMART jobs found on the verified Klimb board')
    }

    let cursor = extractLoadMoreCursor(boardPage.html)
    const seenCursors = new Set()
    let pageCount = 0

    while (cursor && pageCount < maxPages && !seenCursors.has(cursor)) {
      seenCursors.add(cursor)
      pageCount += 1

      const payload = await fetchJson(`${JOBS_BOARD_URL}?lastPosId=${encodeURIComponent(cursor)}`)
      if (!Array.isArray(payload?.jobs?.positions)) {
        throw new Error('IndiaMART Klimb pagination endpoint no longer returns the verified public jobs payload')
      }

      addJobs(extractPaginatedJobs(payload))

      const lastPositionId = normalizeWhitespace(payload.jobs.positions.at(-1)?.id)
      if (payload.showLoadMore === true && lastPositionId && !seenCursors.has(lastPositionId)) {
        cursor = lastPositionId
      } else {
        cursor = null
      }
    }

    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    if (selectedJobs.length > 0) {
      const detailPage = await fetchPage(selectedJobs[0].sourceUrl)
      if (!hasVerifiedJobDetailPage(detailPage, selectedJobs[0])) {
        throw new Error('IndiaMART job detail pages no longer match the verified public jobs surface')
      }
    }

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async () => createIndiaMartScraper().run()

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
