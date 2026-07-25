import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'neilsoft'
export const COMPANY = 'Neilsoft Ltd'
export const HOMEPAGE_URL = 'https://neilsoft.com/'
export const CAREERS_URL = 'https://neilsoft.com/careers'
export const INDIA_OPENINGS_URL = 'https://neilsoft.com/careers/current-job-openings-india'
export const APPLICATION_EMAIL = 'careers@neilsoft.com'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeJobCode = (value) =>
  normalizeWhitespace(String(value ?? '').replace(/^\[|\]$/g, ''))

const parseLocation = (value) => {
  const rawLocation = normalizeWhitespace(value)
  if (!rawLocation) {
    return {
      location: null,
      city: null,
      remoteStatus: 'On-site',
    }
  }

  if (/^any\s*\/\s*wfh$/i.test(rawLocation)) {
    return {
      location: 'Any/WFH, India',
      city: null,
      remoteStatus: 'Remote',
    }
  }

  const remoteStatus = /wfh|remote/i.test(rawLocation)
    ? 'Remote'
    : /hybrid/i.test(rawLocation)
      ? 'Hybrid'
      : 'On-site'

  const parts = rawLocation
    .split(/\s*\/\s*|,\s*/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  const containsIndia = parts.some((part) => /india/i.test(part))
  const normalizedLocation = parts.join(', ')
  const location = containsIndia ? normalizedLocation : `${normalizedLocation}, India`
  const city = remoteStatus === 'Remote'
    ? null
    : parts.find((part) => part && !/^(india|neilsoft india offices)$/i.test(part)) || null

  return {
    location,
    city,
    remoteStatus,
  }
}

const normalizeExperience = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const rangeMatch = normalized.match(/(\d+\s*(?:to|-)\s*\d+\s*years?)/i)
  if (rangeMatch) {
    return normalizeWhitespace(rangeMatch[1])
  }

  const plusMatch = normalized.match(/(\d+\+?\s*years?)/i)
  return plusMatch ? normalizeWhitespace(plusMatch[1]) : null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Engineering Services &amp; Design \|Neilsoft/i.test(page)
    && /global Engineering Services & Solutions company/i.test(text)
    && /<a[^>]+href=["']\/careers["'][^>]*>\s*Careers\s*<\/a>/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Careers at Neilsoft \| Explore Opportunities/i.test(page)
    && /Why Neilsoft \?/i.test(text)
    && /Employee Testimonials/i.test(text)
    && /Current Job Openings-India/i.test(text)
    && /href=["']\/careers\/current-job-openings-india["']/i.test(page)
}

export const hasOfficialIndiaOpeningsSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Current Job Openings in India \| Neilsoft Careers/i.test(page)
    && /Current job openings India/i.test(text)
    && /A list of our current job openings is provided below/i.test(text)
    && /careers@neilsoft\.com/i.test(text)
    && /href=["']\/careers\/current-job-openings-india\/[^"']+["']/i.test(page)
    && (/Job Categories/i.test(text) || /<div class="Currer[^"]*">/i.test(page))
}

export const hasOfficialJobDetailSignal = (html, expectedTitle = null) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''
  const normalizedTitle = normalizeWhitespace(expectedTitle)

  return /Qualification:/i.test(text)
    && /Background\s*&\s*Skills:/i.test(text)
    && /careers@neilsoft\.com/i.test(text)
    && (/Current Job Openings-India/i.test(text) || /<meta[^>]+property=["']og:title["']/i.test(page) || /<h1[^>]*>/i.test(page))
    && (!normalizedTitle || new RegExp(normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text))
}

export const extractJobsFromIndiaOpeningsPage = (html) => {
  if (!hasOfficialIndiaOpeningsSignal(html)) {
    throw new Error('Neilsoft official India openings page changed; refusing to scrape')
  }

  const page = String(html ?? '')
  const startAfterJobCategories = /<h2[^>]*>\s*Job Categories\s*<\/h2>/i.exec(page)
  const firstDepartmentHeading = [...page.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .find((match) => {
      const headingText = stripTags(match[1]) || ''
      return !/^(Job Categories|Share the page)$/i.test(headingText)
    })
  const firstCardIndex = page.search(/<div class="Currer[^"]*">/i)
  const startIndex = startAfterJobCategories
    ? startAfterJobCategories.index + startAfterJobCategories[0].length
    : firstDepartmentHeading?.index ?? firstCardIndex

  if (startIndex == null || startIndex < 0) {
    throw new Error('Neilsoft official India openings page changed; refusing to scrape')
  }

  const rest = page.slice(startIndex)
  const endMatch = /<h2[^>]*>\s*Share the page\s*<\/h2>/i.exec(rest)
  const sectionHtml = endMatch ? rest.slice(0, endMatch.index) : rest

  const tokens = [...sectionHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>|<div class="Currer[^"]*">([\s\S]*?)<\/div>/gi)]
  const jobs = []
  let currentDepartment = null

  for (const token of tokens) {
    if (token[1]) {
      currentDepartment = stripTags(token[1])
      continue
    }

    const cardHtml = token[2]
    const title = stripTags(cardHtml.match(/<strong>\s*<a[^>]+>([\s\S]*?)<\/a>\s*<\/strong>/i)?.[1])
    const detailPath = normalizeWhitespace(cardHtml.match(/<strong>\s*<a[^>]+href=["']([^"']+)["']/i)?.[1])
    const summaryText = stripTags(cardHtml.split(/<br\s*\/?>/i).slice(1).join(' ')) || ''
    const summaryMatch = summaryText.match(/^(.*?)\s*-\s*Job code:\s*(\[[^\]]+\])/i)
    const applyUrl = normalizeWhitespace(cardHtml.match(/href=["'](mailto:[^"']+)["']/i)?.[1])
    const detailUrl = detailPath ? toAbsoluteUrl(detailPath, INDIA_OPENINGS_URL) : null
    const locationSummary = normalizeWhitespace(summaryMatch?.[1])
    const jobCode = normalizeJobCode(summaryMatch?.[2])

    if (!currentDepartment || !title || !detailUrl || !locationSummary || !jobCode) {
      throw new Error('Neilsoft official India openings page changed; refusing to scrape')
    }

    const { location, city, remoteStatus } = parseLocation(locationSummary)

    jobs.push({
      title,
      company: COMPANY,
      department: currentDepartment,
      location,
      city,
      country: 'India',
      jobId: jobCode,
      requisitionId: jobCode,
      sourceUrl: detailUrl,
      applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus,
    })
  }

  if (jobs.length === 0) {
    throw new Error('Neilsoft official India openings page changed; refusing to scrape')
  }

  return jobs
}

export const extractJobDetail = (html, sourceUrl) => {
  if (!hasOfficialJobDetailSignal(html)) {
    throw new Error(`Neilsoft job detail page changed for ${sourceUrl}; refusing to scrape`)
  }

  const title = stripTags(
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      || html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1],
  )
  const minimumQualification = stripTags(
    html.match(/<strong>\s*Qualification:\s*<\/strong>\s*([\s\S]*?)(?:<br\s*\/?>|<\/p>)/i)?.[1],
  )
  const listHtml = html.match(/Background\s*&amp;\s*Skills:\s*<\/strong>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i)?.[1] || ''
  const bullets = [...listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
  const experienceRequired = bullets.map((item) => normalizeExperience(item)).find(Boolean) || null
  const preferredQualification = null
  const requiredSkills = bullets.filter((item) => item && item !== null && normalizeExperience(item) !== item && !/years? of experience/i.test(item))
  const applyUrl = normalizeWhitespace(html.match(/href=["'](mailto:[^"']+)["']/i)?.[1])
  const jobDescriptionParts = [
    minimumQualification ? `Qualification: ${minimumQualification}` : null,
    ...bullets,
  ].filter(Boolean)
  const jobDescription = normalizeWhitespace(jobDescriptionParts.join(' '))

  if (!title || !minimumQualification || bullets.length === 0) {
    throw new Error(`Neilsoft job detail page changed for ${sourceUrl}; refusing to scrape`)
  }

  return {
    title,
    minimumQualification,
    experienceRequired,
    preferredQualification,
    requiredSkills,
    jobDescription,
    applyUrl,
    sourceUrl,
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

export const createNeilsoftScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Neilsoft official homepage changed; refusing to scrape')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Neilsoft official careers landing page changed; refusing to scrape')
    }

    const openingsHtml = await fetchText(INDIA_OPENINGS_URL)
    const baseJobs = extractJobsFromIndiaOpeningsPage(openingsHtml)
    const jobs = []

    for (const baseJob of baseJobs) {
      const detailHtml = await fetchText(baseJob.sourceUrl)
      if (!hasOfficialJobDetailSignal(detailHtml, baseJob.title)) {
        throw new Error(`Neilsoft job detail page changed for ${baseJob.sourceUrl}; refusing to scrape`)
      }

      const detail = extractJobDetail(detailHtml, baseJob.sourceUrl)

      jobs.push({
        ...baseJob,
        ...detail,
        source: SOURCE,
        link: baseJob.sourceUrl,
        scrapedAt: (overrideNow || now)(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createNeilsoftScraper().run(options)

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
