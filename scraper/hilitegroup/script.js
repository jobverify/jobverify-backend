import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'hilitegroup'
export const COMPANY = 'HiLITE Group'
export const HOMEPAGE_URL = 'https://hilitegroup.com/'
export const CAREERS_URL = 'https://hilitegroup.com/explore-careers/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtml(value)
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const absoluteUrl = (value) => {
  if (!value) return null
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parseLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: 'India',
      city: null,
    }
  }

  const parts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  const city = parts.length === 1 ? normalizeCity(parts[0]) : null

  return {
    location: `${normalized}, India`,
    city,
  }
}

const extractFieldValue = (sectionHtml, label) => normalizeWhitespace(
  sectionHtml.match(new RegExp(
    `<li\\b[^>]*>\\s*${escapeRegExp(label)}\\s*<\\/li>\\s*<li\\b[^>]*>([\\s\\S]*?)<\\/li>`,
    'i',
  ))?.[1],
)

const buildDescription = ({ company, location, qualification, experience, vacancy }) => [
  `Company: ${company}`,
  `Location: ${location}`,
  `Qualification: ${qualification}`,
  `Year of experience: ${experience}`,
  `Vacancy: ${vacancy}`,
].join(' | ')

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*HiLITE Group\s*<\/title>/i.test(page)
    && /About HiLITE Group/i.test(page)
    && /href=["'](?:https?:\/\/hilitegroup\.com)?\/explore-careers\/?["']/i.test(page)
    && /Explore Careers/i.test(page)
    && /Life At HiLITE/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const applyCount = (page.match(/>\s*Apply Now\s*</gi) || []).length

  return /Explore Career Opportunities at HiLITE Group|Explore Careers/i.test(page)
    && /Home Careers Explore Careers/i.test(page)
    && /Year of experience/i.test(page)
    && /Qualification/i.test(page)
    && /Vacancy/i.test(page)
    && applyCount >= 3
}

export const extractPublicListings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Expected verified HiLITE careers surface with first-party public listings')
  }

  const page = String(html ?? '')
  const sections = [...page.matchAll(
    /<article\b[^>]*class=["'][^"']*\bjob-opening\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi,
  )]

  if (sections.length === 0) {
    throw new Error('Expected verified HiLITE careers surface with first-party public listings')
  }

  const jobs = sections.map((match) => {
    const sectionHtml = match[1]
    const title = stripTags(sectionHtml.match(/<h4\b[^>]*>([\s\S]*?)<\/h4>/i)?.[1])
    const company = extractFieldValue(sectionHtml, 'Company')
    const locationText = extractFieldValue(sectionHtml, 'Location')
    const minimumQualification = extractFieldValue(sectionHtml, 'Qualification')
    const experienceRequired = extractFieldValue(sectionHtml, 'Year of experience')
    const vacancy = extractFieldValue(sectionHtml, 'Vacancy')
    const applyUrl = absoluteUrl(sectionHtml.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i)?.[1])
    const { location, city } = parseLocation(locationText)
    const identity = slugify(`${title}-${company}-${locationText}`)
    const jobId = `${SOURCE}-${identity}`

    if (
      !title
      || !company
      || !locationText
      || !minimumQualification
      || !experienceRequired
      || !vacancy
      || !applyUrl
      || !identity
    ) {
      throw new Error('Expected verified HiLITE careers surface with first-party public listings')
    }

    return {
      title,
      company,
      department: null,
      location,
      city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: `${CAREERS_URL}#${jobId}`,
      applyUrl,
      employmentType: null,
      experienceRequired,
      minimumQualification,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: buildDescription({
        company,
        location: locationText,
        qualification: minimumQualification,
        experience: experienceRequired,
        vacancy,
      }),
    }
  })

  return jobs
    .sort((left, right) => (
      left.title.localeCompare(right.title)
      || left.company.localeCompare(right.company)
      || left.location.localeCompare(right.location)
    ))
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createHiliteGroupScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Expected verified official HiLITE homepage with first-party careers handoff')
    }

    const careersHtml = await fetchText(CAREERS_URL)

    return extractPublicListings(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createHiliteGroupScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total HiLITE Group jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
