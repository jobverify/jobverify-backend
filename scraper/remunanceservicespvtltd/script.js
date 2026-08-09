import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'remunanceservicespvtltd'
export const COMPANY = 'Remunance Services Pvt. Ltd.'
export const HOMEPAGE_URL = 'https://remunance.com/'
export const JOBS_URL = 'https://remunance.com/jobs/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ndash;|&mdash;|&#8211;|&#8212;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<[^>]+>/g, ' '),
)

const normalizeUrl = (value) => {
  const parsed = new URL(value, HOMEPAGE_URL)

  if (!parsed.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(parsed.pathname)) {
    parsed.pathname = `${parsed.pathname}/`
  }

  parsed.hash = ''
  return parsed.toString()
}

const toLocation = (cityText) => {
  const city = normalizeWhitespace(cityText)
  if (!city) {
    return {
      location: null,
      city: null,
      country: 'India',
    }
  }

  return {
    location: `${city}, India`,
    city,
    country: 'India',
  }
}

const extractCanonicalUrl = (html) =>
  normalizeWhitespace(String(html ?? '').match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? null)

const extractFooterCompany = (html) =>
  stripTags(String(html ?? '').match(/<footer[\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] ?? null)

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const htmlToLines = (html) => decodeHtmlEntities(String(html ?? ''))
  .replace(/\r/g, '')
  .replace(/<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/section|\/article|\/main|\/figure|\/table|\/tbody|\/tr|\/td|\/h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<(?:p|div|li|ul|ol|section|article|main|figure|table|tbody|tr|td|h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split(/\n+/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const dedupe = (values) => {
  const seen = new Set()
  return values.filter((value) => {
    const key = value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const shouldUseBrowserFallback = (error) =>
  /HTTP (?:403|429)\b/i.test(String(error?.message ?? ''))

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Best Employer of Record \(EOR\) Services Provider India\s*<\/title>/i.test(page)
    && normalizeWhitespace(extractCanonicalUrl(page)) === HOMEPAGE_URL
    && extractFooterCompany(page) === 'Remunance Services Pvt Ltd'
    && /linkedin\.com\/company\/remunance/i.test(page)
}

export const hasJobsPageSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Job Openings Archive - Remunance\s*<\/title>/i.test(page)
    && normalizeWhitespace(extractCanonicalUrl(page)) === JOBS_URL
    && /awsm-job-listing-item/i.test(page)
    && extractFooterCompany(page) === 'Remunance Services Pvt Ltd'
}

export const extractJobCards = (html) => {
  if (!hasJobsPageSignal(html)) {
    throw new Error('Remunance jobs archive no longer matches the verified first-party public jobs surface')
  }

  const jobs = [...String(html ?? '').matchAll(
    /<div\b[^>]*class=["'][^"']*awsm-job-listing-item[^"']*["'][^>]*id=["']awsm-grid-item-(\d+)["'][^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*awsm-job-item[^"']*["'][^>]*>[\s\S]*?<h2\b[^>]*class=["'][^"']*awsm-job-post-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/gi,
  )]
    .map((match) => {
      const jobId = normalizeWhitespace(match[1])
      const sourceUrl = normalizeUrl(match[2])
      const title = stripTags(match[3])

      if (!jobId || !title || !sourceUrl.startsWith(JOBS_URL)) {
        return null
      }

      return {
        title,
        company: COMPANY,
        department: null,
        location: null,
        city: null,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        remoteStatus: 'On-site',
      }
    })
    .filter(Boolean)

  if (jobs.length === 0) {
    throw new Error('Remunance jobs archive no longer exposes trusted public job cards')
  }

  return jobs
}

const extractTableFields = (html) => {
  const fields = new Map()

  for (const match of String(html ?? '').matchAll(
    /<tr\b[^>]*>\s*<td\b[^>]*>[\s\S]*?<\/td>\s*<td\b[^>]*>\s*(?:<strong>)?([\s\S]*?)(?:<\/strong>)?\s*<\/td>\s*<td\b[^>]*>\s*(?:<strong>)?([\s\S]*?)(?:<\/strong>)?\s*<\/td>\s*<\/tr>/gi,
  )) {
    const label = stripTags(match[1])?.replace(/:$/, '')
    const value = stripTags(match[2])

    if (label && value) {
      fields.set(label.toLowerCase(), value)
    }
  }

  return fields
}

const extractEntryContentHtml = (html) => {
  const match = String(html ?? '').match(
    /<div\b[^>]*class=["'][^"']*awsm-job-entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<div\b[^>]*class=["'][^"']*awsm-job-specifications-container[^"']*["'][^>]*>[\s\S]*?<\/div>\s*)?<div\b[^>]*class=["'][^"']*awsm-job-form[^"']*["']/i,
  )

  return match?.[1] ?? null
}

const buildDetailContent = (entryHtml) => {
  const withoutTable = String(entryHtml ?? '').replace(/<figure\b[^>]*class=["'][^"']*wp-block-table[^"']*["'][\s\S]*?<\/figure>/i, '')
  const lines = htmlToLines(withoutTable)
    .filter((line) => !/^Greetings from Remunance\s*!?$/i.test(line))
    .filter((line) => line !== 'Job Description')
    .filter((line) => line !== 'Apply for this position')

  return {
    lines,
    listItems: extractListItems(withoutTable),
  }
}

const buildRequiredSkills = ({ lines, listItems }) => {
  const trailingSkills = []
  let inSkillSection = false

  for (const line of lines) {
    if (/^(?:Key Competencies|Skills and Qualifications):?$/i.test(line)) {
      inSkillSection = true
      continue
    }

    if (inSkillSection) {
      trailingSkills.push(line)
    }
  }

  return dedupe([
    ...listItems,
    ...trailingSkills,
  ].filter(Boolean))
}

const buildJobDescription = (lines) =>
  normalizeWhitespace(lines.join(' '))

const buildPostingDate = (html) => {
  const value = normalizeWhitespace(
    String(html ?? '').match(/<time\b[^>]*class=["'][^"']*updated[^"']*["'][^>]*datetime=["']([^"']+)["']/i)?.[1],
  )
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

const hasOfficialJobDetailSignal = (html, listing = {}) => {
  const page = String(html ?? '')
  const canonicalUrl = normalizeWhitespace(extractCanonicalUrl(page))
  const pageTitle = stripTags(page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null)
  const heading = stripTags(page.match(/<h1\b[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? null)

  return pageTitle === `${listing.title} - Remunance`
    && heading === listing.title
    && (!canonicalUrl || canonicalUrl === normalizeUrl(listing.sourceUrl || listing.applyUrl || ''))
    && /<h2>\s*Apply for this position\s*<\/h2>/i.test(page)
    && /id=["']awsm-application-form["']/i.test(page)
    && extractFooterCompany(page) === 'Remunance Services Pvt Ltd'
}

export const extractJobDetail = (html, listing = {}) => {
  if (!hasOfficialJobDetailSignal(html, listing)) {
    throw new Error('Remunance job detail page no longer matches the verified first-party public jobs surface')
  }

  const page = String(html ?? '')
  const title = stripTags(page.match(/<h1\b[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? null)
    || listing.title
    || null
  const fields = extractTableFields(page)
  const entryHtml = extractEntryContentHtml(page)
  const { lines, listItems } = buildDetailContent(entryHtml)
  const requiredSkills = buildRequiredSkills({ lines, listItems })
  const locationData = toLocation(fields.get('location'))

  return {
    ...listing,
    title,
    company: COMPANY,
    department: null,
    location: locationData.location,
    city: locationData.city,
    country: locationData.country,
    employmentType: null,
    experienceRequired: fields.get('experience') || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills,
    postingDate: buildPostingDate(page),
    closingDate: null,
    jobDescription: buildJobDescription(lines),
    remoteStatus: 'On-site',
  }
}

export const createRemunanceServicesPvtLtdScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchBrowserText,
    fetchBrowserListingHtml,
    now = () => new Date().toISOString(),
  } = {}) {
    const browserTextFetcher = typeof fetchBrowserText === 'function' ? fetchBrowserText : null
    const browserListingFetcher =
      typeof fetchBrowserListingHtml === 'function' ? fetchBrowserListingHtml : null

    const fetchPageText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!browserTextFetcher || !shouldUseBrowserFallback(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    const fetchListingHtml = async () => {
      try {
        return await fetchText(JOBS_URL)
      } catch (error) {
        if (!browserListingFetcher || !shouldUseBrowserFallback(error)) {
          throw error
        }

        return browserListingFetcher()
      }
    }

    const homepageHtml = await fetchPageText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Remunance homepage no longer matches the verified first-party company surface')
    }

    const listingHtml = await fetchListingHtml()
    const listings = extractJobCards(listingHtml)
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchPageText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        ...detail,
        source: SOURCE,
        link: detail.applyUrl || detail.sourceUrl,
        scrapedAt: now(),
        companyCareerPage: JOBS_URL,
        companyDomain: 'remunance.com',
        atsPlatform: 'wp-job-openings',
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createRemunanceServicesPvtLtdScraper().run(options)

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
