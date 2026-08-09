import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const BASE_URL = 'https://careers.techmahindra.com/'
const LISTING_PATH = 'CurrentOpportunity.aspx'
const INDIA_COUNTRY_CODE = 'IND'
const DEFAULT_MAX_EXPERIENCE = '0'

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

export const extractAspNetState = (html) => {
  const state = {}

  for (const match of String(html).matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/gi)) {
    state[match[1]] = decodeHtmlEntities(match[2])
  }

  return state
}

export const extractCurrentOpportunities = (html) => {
  const cardPattern = /<span>([\s\S]*?)<\/span>[\s\S]*?<div style="margin-bottom:\s*5px;[\s\S]*?font-size:\s*13px;">([\s\S]*?)<\/div>[\s\S]*?<b>\s*Skill Set\s*<\/b>\s*:\s*([\s\S]*?)<br\s*\/?>[\s\S]*?<b>\s*Experience\s*<\/b>\s*:\s*([\s\S]*?)<br\s*\/?>[\s\S]*?<b>\s*Location\s*<\/b>\s*:\s*([\s\S]*?)<\/p>[\s\S]*?href="([^"]*JobDetails\.aspx\?[^"]+)"/gi
  const cards = []

  for (const match of String(html).matchAll(cardPattern)) {
    const category = normalizeWhitespace(match[1])
    const title = normalizeWhitespace(match[2])
    const skillSet = normalizeWhitespace(match[3])
    const experienceRequired = normalizeWhitespace(match[4])
    const location = normalizeWhitespace(match[5])
    const relativeUrl = normalizeWhitespace(match[6])
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

const fetchText = async (url, options = {}, attempt = 0) => {
  try {
    const response = await fetch(url, {
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
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }

    return response.text()
  } catch (error) {
    if (attempt >= ((config.retryAttempts || 1) - 1)) throw error
    const delay = (config.retryBaseDelayMs || 1000) * (attempt + 1)
    await new Promise((resolve) => setTimeout(resolve, delay))
    return fetchText(url, options, attempt + 1)
  }
}

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

export const run = async () => {
  const listingUrl = toAbsoluteUrl(LISTING_PATH)
  const initialHtml = await fetchText(listingUrl)
  let pageHtml = await fetchText(listingUrl, {
    method: 'POST',
    body: new URLSearchParams(buildIndiaSearchPayload(extractAspNetState(initialHtml))).toString(),
  })

  const jobs = []
  const seenRefs = new Set()
  const seenUrls = new Set()
  const maxPages = Number.isInteger(config.maxPages) ? config.maxPages : 25

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const listings = extractCurrentOpportunities(pageHtml)

    for (const listing of listings) {
      if (!listing.sourceUrl || seenUrls.has(listing.sourceUrl)) continue
      seenUrls.add(listing.sourceUrl)

      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)
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
      body: new URLSearchParams(buildPagePostbackPayload(state, {
        target: nextTarget,
        country: INDIA_COUNTRY_CODE,
        maxExperience: DEFAULT_MAX_EXPERIENCE,
      })).toString(),
    })
  }

  return jobs
}
