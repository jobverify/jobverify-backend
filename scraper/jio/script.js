import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const BASE_URL = 'https://careers.jio.com/'
const CATEGORY_PATH = 'frmJobCategories.aspx'
const NEXT_BUTTON_NAME = 'ctl00$MainContent$lstJoblist$DataPager1$ctl00$lnkNext'
const ENGINEERING_CATEGORY_PATTERNS = [
  /\bengineering\b/i,
  /\binfrastructure\b/i,
  /\bit\s*&\s*systems\b/i,
  /\binformation security\b/i,
]

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
    .replace(/<li\b[^>]*>/gi, '\n')
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

const extractJobId = (title) => extractFirst(/\(\s*(\d+)\s*\)/, title)

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

const extractNumberedLines = (value) => {
  const text = decodeHtmlEntities(String(value ?? ''))
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')

  const matches = [...text.matchAll(/(?:^|\s)(\d+\.\s*.*?)(?=\s+\d+\.\s*|$)/g)]
  if (matches.length > 0) {
    return matches
      .map((match) => normalizeWhitespace(match[1]?.replace(/^\d+\.\s*/, '')))
      .filter(Boolean)
  }

  const normalized = normalizeWhitespace(text)
  return normalized ? [normalized] : []
}

export const extractAspNetState = (html) => {
  const state = {}

  for (const match of String(html).matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/gi)) {
    state[match[1]] = decodeHtmlEntities(match[2])
  }

  return state
}

export const extractFunctionCategories = (html) => [...String(html).matchAll(
  /<li class="list-cont">[\s\S]*?hdfunctioncode_\d+" value="([^"]+)"[\s\S]*?hdDescription_\d+" value="([^"]+)"[\s\S]*?<a[^>]*href="([^"]+)"[\s\S]*?lblfunctional_\d+">([\s\S]*?)<\/span>[\s\S]*?lblfunctionjobCount_\d+">(\d+)<\/span>[\s\S]*?<\/li>/gi,
)]
  .map((match) => {
    const label = normalizeWhitespace(match[4]) || normalizeWhitespace(match[2])
    const url = toAbsoluteUrl(decodeHtmlEntities(match[3]))
    const functionCode = normalizeWhitespace(match[1])
    const jobCount = Number.parseInt(match[5], 10)

    if (!label || !url || !functionCode || !Number.isInteger(jobCount)) return null

    return {
      label,
      functionCode,
      jobCount,
      url,
    }
  })
  .filter(Boolean)

export const selectEngineeringCategories = (categories = []) => categories
  .filter((item) => item.jobCount > 0)
  .filter((item) => ENGINEERING_CATEGORY_PATTERNS.some((pattern) => pattern.test(item.label)))

export const extractListings = (html) => [...String(html).matchAll(
  /<a id="MainContent_lstJoblist_hylUser_(\d+)" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<span id="MainContent_lstJoblist_Label2_\1">([\s\S]*?)<\/span>[\s\S]*?<span id="MainContent_lstJoblist_lblfunctional_\1">([\s\S]*?)<\/span>[\s\S]*?<span id="MainContent_lstJoblist_Label1_\1">([\s\S]*?)<\/span>/gi,
)]
  .map((match) => {
    const title = normalizeWhitespace(match[3])
    const jobId = extractJobId(title)
    const sourceUrl = toAbsoluteUrl(decodeHtmlEntities(match[2]))
    const location = normalizeWhitespace(match[4])

    if (!title || !jobId || !sourceUrl) return null

    return {
      title,
      jobId,
      requisitionId: jobId,
      location,
      city: extractCity(location),
      department: normalizeWhitespace(match[5]),
      postingDate: normalizeWhitespace(match[6]),
      sourceUrl,
    }
  })
  .filter(Boolean)

const hasNextPage = (html) => /name="ctl00\$MainContent\$lstJoblist\$DataPager1\$ctl00\$lnkNext"[^>]*class="[^"]*search-orange-but/i.test(String(html))
  && !/name="ctl00\$MainContent\$lstJoblist\$DataPager1\$ctl00\$lnkNext"[^>]*disabled="disabled"/i.test(String(html))

export const buildNextPagePayload = (state = {}) => ({
  ...state,
  __EVENTTARGET: '',
  __EVENTARGUMENT: '',
  [NEXT_BUTTON_NAME]: 'Next',
})

export const extractJobDetail = (html, listing = {}) => {
  const title = normalizeWhitespace(
    extractFirst(/<span id="MainContent_lblJobTitle">([\s\S]*?)<\/span>/i, html),
  ) || listing.title || null
  const location = normalizeWhitespace(
    extractFirst(/<span id="MainContent_lblLoc">([\s\S]*?)<\/span>/i, html),
  ) || normalizeWhitespace(
    extractFirst(/Location Map\s*:\s*([^<]+)/i, html),
  ) || listing.location || null
  const sourceUrl = listing.sourceUrl || toAbsoluteUrl(
    extractFirst(/<form method="post" action="([^"]+)"/i, html),
  )

  return {
    title,
    jobId: extractJobId(title) || listing.jobId || null,
    requisitionId: extractJobId(title) || listing.requisitionId || null,
    department: normalizeWhitespace(
      extractFirst(/<span id="MainContent_lblSec">([\s\S]*?)<\/span>/i, html),
    ) || listing.department || null,
    location,
    city: extractCity(location),
    postingDate: normalizeWhitespace(
      extractFirst(/<span id="MainContent_lblPostedDate">([\s\S]*?)<\/span>/i, html),
    ) || listing.postingDate || null,
    employmentType: 'Full-time',
    experienceRequired: normalizeWhitespace(
      extractFirst(/<span id="MainContent_lblExpReq">([\s\S]*?)<\/span>/i, html),
    ),
    jobDescription: stripTags(
      extractFirst(/<span id="MainContent_lblSummRole">([\s\S]*?)<\/span>/i, html),
    ),
    minimumQualification: normalizeWhitespace(
      extractFirst(/<span id="MainContent_lblEduReq">([\s\S]*?)<\/span>/i, html),
    ),
    preferredQualification: null,
    requiredSkills: extractNumberedLines(
      extractFirst(/<span id="MainContent_lblSkill">([\s\S]*?)<\/span>/i, html),
    ),
    applyUrl: sourceUrl,
    sourceUrl,
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
          Referer: options.referer || url,
        } : {}),
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

const runCategory = async (category, seenJobIds) => {
  const jobs = []
  let pageHtml = await fetchText(category.url)
  const maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const listings = extractListings(pageHtml)
    if (listings.length === 0) break

    for (const listing of listings) {
      const stableId = listing.jobId || listing.sourceUrl
      if (stableId && seenJobIds.has(stableId)) continue

      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)
      const detailId = detail.jobId || stableId
      if (detailId && seenJobIds.has(detailId)) continue
      if (detailId) seenJobIds.add(detailId)

      jobs.push({
        jobId: detail.jobId || listing.jobId,
        requisitionId: detail.requisitionId || listing.requisitionId,
        title: detail.title || listing.title,
        company: 'Reliance Jio',
        department: detail.department || listing.department || category.label,
        location: detail.location || listing.location,
        city: detail.city || listing.city,
        link: detail.applyUrl || listing.sourceUrl,
        applyUrl: detail.applyUrl || listing.sourceUrl,
        sourceUrl: detail.sourceUrl || listing.sourceUrl,
        source: 'jio',
        employmentType: detail.employmentType,
        experienceRequired: detail.experienceRequired,
        jobDescription: detail.jobDescription,
        minimumQualification: detail.minimumQualification,
        preferredQualification: detail.preferredQualification,
        requiredSkills: detail.requiredSkills,
        postingDate: detail.postingDate || listing.postingDate,
        scrapedAt: new Date().toISOString(),
      })
    }

    if (!hasNextPage(pageHtml)) break

    pageHtml = await fetchText(category.url, {
      method: 'POST',
      body: new URLSearchParams(buildNextPagePayload(extractAspNetState(pageHtml))).toString(),
      referer: category.url,
    })
  }

  return jobs
}

export const run = async () => {
  const categoriesHtml = await fetchText(toAbsoluteUrl(CATEGORY_PATH))
  const categories = selectEngineeringCategories(extractFunctionCategories(categoriesHtml))
  const maxCategories = Number.isInteger(config.maxCategories)
    ? config.maxCategories
    : Number.POSITIVE_INFINITY
  const seenJobIds = new Set()
  const jobs = []

  for (const category of categories.slice(0, maxCategories)) {
    const categoryJobs = await runCategory(category, seenJobIds)
    jobs.push(...categoryJobs)
  }

  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Jio scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India engineering jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'jio')
    console.log('DB result:', result)
    process.exit(0)
  }
}
