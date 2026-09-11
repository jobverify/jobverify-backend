import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const BASE_URL = 'https://careers.techmahindra.com/'
const LISTING_PATH = 'CurrentOpportunity.aspx'
const INDIA_COUNTRY_CODE = 'IND'
const DEFAULT_MAX_EXPERIENCE = '0'
const DEFAULT_DETAIL_CONCURRENCY = 8
const DEFAULT_FETCH_TIMEOUT_MS = 15000

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#x2F;/gi, '/')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, BASE_URL).toString()
  } catch {
    return null
  }
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(value)
  return match ? transform(match) : null
}

const extractListItems = (value) => [...String(value ?? '').matchAll(/<li>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const resolvePositiveInteger = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

const throwIfAborted = (signal) => {
  if (!signal?.aborted) return
  throw signal.reason || new DOMException('The operation was aborted', 'AbortError')
}

const mapWithConcurrency = async (items, limit, iteratee) => {
  const concurrency = Math.max(1, Number.isInteger(limit) ? limit : 1)
  const results = new Array(items.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < items.length) {
      const currentIndex = cursor
      cursor += 1
      results[currentIndex] = await iteratee(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )

  return results
}

export const extractAspNetState = (html) => {
  const state = {}

  for (const match of String(html).matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/gi)) {
    state[match[1]] = decodeHtmlEntities(match[2])
  }

  return state
}

export const extractCurrentOpportunities = (html) => {
  const page = String(html ?? '')
  const detailLinkPattern = /<a[^>]+href="([^"]*JobDetails\.aspx\?[^"]+)"[^>]*>/gi
  const cards = []

  for (const match of page.matchAll(detailLinkPattern)) {
    const cardHtml = page.slice(Math.max(0, match.index - 3500), match.index + match[0].length)
    const titleMatches = [...cardHtml.matchAll(
      /<div[^>]*style="[^"]*margin-bottom:\s*5px;[^"]*font-size:\s*13px;?[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    )]
    const titleMatch = titleMatches.at(-1)
    const beforeTitle = titleMatch ? cardHtml.slice(0, titleMatch.index) : cardHtml
    const fieldsHtml = titleMatch ? cardHtml.slice(titleMatch.index) : cardHtml
    const spanMatches = [...beforeTitle.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
    const category = normalizeWhitespace(spanMatches.at(-1)?.[1])
    const title = normalizeWhitespace(titleMatch?.[1])
    const skillSet = normalizeWhitespace(
      extractFirst(/<b>\s*Skill Set\s*<\/b>\s*:\s*([\s\S]*?)(?:<br\s*\/?>|<\/p>)/i, fieldsHtml),
    )
    const experienceRequired = normalizeWhitespace(
      extractFirst(/<b>\s*Experience\s*<\/b>\s*:\s*([\s\S]*?)(?:<br\s*\/?>|<\/p>)/i, fieldsHtml),
    )
    const location = normalizeWhitespace(
      extractFirst(/<b>\s*Location\s*<\/b>\s*:\s*([\s\S]*?)<\/p>/i, fieldsHtml),
    )
    const relativeUrl = normalizeWhitespace(match[1])
    const sourceUrl = toAbsoluteUrl(relativeUrl)
    const jobCode = sourceUrl
      ? new URL(sourceUrl).searchParams.get('JobCode')
      : null

    if (!title || !sourceUrl || !jobCode) continue

    cards.push({
      title,
      category,
      location,
      city: location,
      skillSet,
      experienceRequired,
      jobCode,
      sourceUrl,
    })
  }

  return cards
}

export const extractPagerTargets = (html) => [...String(html).matchAll(
  /<a(?: onclick="return false;")?[^>]*class="(page_disabled|page_enabled)"[^>]*href="javascript:__doPostBack\(&#39;([^']+?)&#39;,\&#39;\&#39;\)">([^<]+)<\/a>/gi,
)]
  .map((match) => ({
    label: normalizeWhitespace(match[3]),
    target: match[2],
    current: match[1] === 'page_disabled',
  }))
  .filter((item) => item.label && item.target)

export const buildPagePostbackPayload = (state = {}, options = {}) => ({
  ...state,
  __EVENTTARGET: options.target || '',
  __EVENTARGUMENT: '',
  'ctl00$ContentPlaceHolder1$ddlCountry': options.country || INDIA_COUNTRY_CODE,
  'ctl00$ContentPlaceHolder1$ddlTotExpYears': options.maxExperience || DEFAULT_MAX_EXPERIENCE,
})

const buildIndiaSearchPayload = (state = {}) => ({
  ...state,
  'ctl00$ContentPlaceHolder1$ddlCountry': INDIA_COUNTRY_CODE,
  'ctl00$ContentPlaceHolder1$ddlTotExpYears': DEFAULT_MAX_EXPERIENCE,
  'ctl00$ContentPlaceHolder1$btnSearchJobs': 'Search',
})

const getSectionHtml = (html, heading) => extractFirst(
  new RegExp(`<h4>${heading}:<\\/h4>\\s*<ul>([\\s\\S]*?)<\\/ul>`, 'i'),
  html,
)

export const extractJobDetail = (html, listing = {}) => {
  const location = normalizeWhitespace(
    extractFirst(/<span>\s*([A-Z\s]+\[India\])\s*<\/span>/i, html),
  )
  const city = normalizeWhitespace(location?.split('[')[0] ?? null)
  const jobReferenceNo = normalizeWhitespace(
    extractFirst(/<b>\s*Job Reference No\s*:\s*<\/b>\s*<span[^>]*>\s*([\s\S]*?)\s*<\/span>/i, html),
  )
  const experienceRequired = normalizeWhitespace(
    extractFirst(/<h3>\s*Years of Experience:\s*([\s\S]*?)<\/h3>/i, html),
  )
  const summary = stripTags(extractFirst(/<h4>Job Summary:<\/h4>\s*<p>([\s\S]*?)<\/p>/i, html))
  const responsibilities = extractListItems(getSectionHtml(html, 'Responsibilities'))
  const mandatorySkills = extractListItems(getSectionHtml(html, 'Mandatory Skills'))
  const preferredSkills = extractListItems(getSectionHtml(html, 'Preferred Skills'))
  const qualifications = extractListItems(getSectionHtml(html, 'Qualifications'))
  const descriptionParts = [
    summary,
    responsibilities.length ? `Responsibilities: ${responsibilities.join(' ')}` : null,
    mandatorySkills.length ? `Mandatory Skills: ${mandatorySkills.join(' ')}` : null,
    preferredSkills.length ? `Preferred Skills: ${preferredSkills.join(' ')}` : null,
    qualifications.length ? `Qualifications: ${qualifications.join(' ')}` : null,
  ].filter(Boolean)

  return {
    location,
    city,
    jobId: jobReferenceNo,
    requisitionId: jobReferenceNo,
    employmentType: 'Full-time',
    experienceRequired,
    jobDescription: normalizeWhitespace(descriptionParts.join(' ')),
    minimumQualification: qualifications[0] ?? null,
    preferredQualification: null,
    requiredSkills: [...mandatorySkills, ...preferredSkills],
    applyUrl: listing.sourceUrl || null,
    sourceUrl: listing.sourceUrl || null,
  }
}

const fetchText = (url, options = {}) => fetchTextWithRetry(url, {
  method: options.method || 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ...(options.body ? {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: toAbsoluteUrl(LISTING_PATH),
    } : {}),
    ...(options.headers || {}),
  },
  body: options.body,
  attempts: config.retryAttempts || 1,
  baseDelayMs: config.retryBaseDelayMs || 1000,
  label: 'techmahindra',
  signal: options.signal,
  timeoutMs: config.fetchTimeoutMs || DEFAULT_FETCH_TIMEOUT_MS,
})

const getNextPagerTarget = (pagerTargets) => {
  const current = pagerTargets.find((item) => item.current)
  const currentPage = Number.parseInt(current?.label || '', 10)

  const numericTargets = pagerTargets
    .filter((item) => /^\d+$/.test(item.label) && !item.current)
    .map((item) => ({
      ...item,
      page: Number.parseInt(item.label, 10),
    }))
    .filter((item) => Number.isInteger(item.page))

  const nextNumeric = numericTargets
    .filter((item) => !Number.isInteger(currentPage) || item.page > currentPage)
    .sort((left, right) => left.page - right.page)[0]

  if (nextNumeric) return nextNumeric.target
  return pagerTargets.find((item) => item.label === '>>')?.target ?? null
}

export const run = async (options = {}) => {
  const signal = options.signal
  const listingUrl = toAbsoluteUrl(LISTING_PATH)
  const initialHtml = await fetchText(listingUrl, { signal })
  let pageHtml = await fetchText(listingUrl, {
    method: 'POST',
    signal,
    body: new URLSearchParams(buildIndiaSearchPayload(extractAspNetState(initialHtml))).toString(),
  })

  const jobs = []
  const seenRefs = new Set()
  const seenUrls = new Set()
  const maxPages = Number.isInteger(options.maxPages)
    ? options.maxPages
    : (Number.isInteger(config.maxPages) ? config.maxPages : 25)
  const detailConcurrency = resolvePositiveInteger(
    options.detailConcurrency ?? config.detailConcurrency,
    DEFAULT_DETAIL_CONCURRENCY,
  )

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const listings = extractCurrentOpportunities(pageHtml)
    const freshListings = []

    for (const listing of listings) {
      if (!listing.sourceUrl || seenUrls.has(listing.sourceUrl)) continue
      seenUrls.add(listing.sourceUrl)
      freshListings.push(listing)
    }

    const pageJobs = await mapWithConcurrency(
      freshListings,
      detailConcurrency,
      async (listing) => {
        throwIfAborted(signal)
        const detailHtml = await fetchText(listing.sourceUrl, { signal })
        const detail = extractJobDetail(detailHtml, listing)
        return { listing, detail }
      },
    )

    for (const { listing, detail } of pageJobs) {
      const reference = detail.jobId || listing.jobCode
      if (reference && seenRefs.has(reference)) continue
      if (reference) seenRefs.add(reference)

      jobs.push({
        jobId: detail.jobId || listing.jobCode,
        requisitionId: detail.requisitionId || listing.jobCode,
        title: listing.title,
        company: 'Tech Mahindra',
        department: listing.category,
        location: detail.location || listing.location,
        city: detail.city || listing.city,
        link: detail.applyUrl || listing.sourceUrl,
        applyUrl: detail.applyUrl || listing.sourceUrl,
        sourceUrl: listing.sourceUrl,
        source: 'techmahindra',
        employmentType: detail.employmentType,
        experienceRequired: detail.experienceRequired || listing.experienceRequired,
        jobDescription: detail.jobDescription,
        minimumQualification: detail.minimumQualification,
        preferredQualification: detail.preferredQualification,
        requiredSkills: detail.requiredSkills.length > 0
          ? detail.requiredSkills
          : (listing.skillSet ? [listing.skillSet] : []),
        scrapedAt: new Date().toISOString(),
      })
    }

    const pagerTargets = extractPagerTargets(pageHtml)
    const nextTarget = getNextPagerTarget(pagerTargets)
    if (!nextTarget) break

    const state = extractAspNetState(pageHtml)
    pageHtml = await fetchText(listingUrl, {
      method: 'POST',
      signal,
      body: new URLSearchParams(buildPagePostbackPayload(state, {
        target: nextTarget,
        country: INDIA_COUNTRY_CODE,
        maxExperience: DEFAULT_MAX_EXPERIENCE,
      })).toString(),
    })
  }

  return jobs
}
