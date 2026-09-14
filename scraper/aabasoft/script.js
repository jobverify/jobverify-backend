import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'aabasoft'
export const COMPANY = 'Aabasoft'
export const COMPANY_DOMAIN = 'aabasoft.com'
export const VERIFIED_AT = '2026-07-14'
export const HOMEPAGE_URL = 'https://www.aabasoft.com/in-en/'
export const CAREERS_URL = 'https://www.aabasoft.com/in-en/career/'
export const SCRAPER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  companyCareerPage: CAREERS_URL,
  companyDomain: COMPANY_DOMAIN,
  countryFilter: 'India',
  atsPlatform: 'official-company-careers',
  paginationStrategy: 'verified-single-page-careers-listing-plus-first-party-detail-pages',
  extractionStrategy:
    'verified-official-homepage+verified-careers-page+first-party-listing-cards+first-party-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&#34;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;|&#x27;/gi, "'")
  .replace(/&ndash;/gi, '–')
  .replace(/&mdash;/gi, '—')
  .replace(/&bull;/gi, '•')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[‐-―]/g, '-')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, HOMEPAGE_URL).toString()
  } catch {
    return null
  }
}

const extractMatch = (value, pattern) => String(value ?? '').match(pattern)?.[1] ?? null

const extractLines = (html) => {
  const matches = [...String(html ?? '').matchAll(/<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)]
  const lines = matches
    .map((match) => stripTags(match[1]))
    .map((line) => line?.replace(/^[•*-]\s*/, '') ?? null)
    .filter(Boolean)

  if (lines.length > 0) return lines

  return stripTags(html)
    ?.split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean) ?? []
}

const extractSectionPanels = (html) => [...String(html ?? '').matchAll(
  /<div class="panel panel-default">[\s\S]*?<h4 class="panel-title">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div class="panel-body">([\s\S]*?)<\/div>[\s\S]*?<\/div>\s*<\/div>/gi,
)].map((match) => ({
  heading: stripTags(match[1]),
  items: extractLines(match[2]),
}))

const extractIntroLines = (html) => {
  const leftColumn = extractMatch(
    html,
    /<div class="col-md-7 career-det-left">([\s\S]*?)<div class="panel-group"/i,
  )

  if (!leftColumn) return []

  const withoutTitle = leftColumn.replace(/<h3 class="career-head">[\s\S]*?<\/h3>/i, '')
  return extractLines(withoutTitle)
}

const extractLocationFromListingSummary = (value) => {
  const summary = normalizeText(value)
  if (!summary) return null

  const marker = summary.match(/\s+(?:location|loc)\b/i)
  if (marker) {
    const context = summary.slice(0, marker.index)
    const prepositions = [...context.matchAll(/\b(?:for|in)\s+/gi)]
    const lastPreposition = prepositions.at(-1)

    if (lastPreposition) {
      return normalizeText(context.slice(lastPreposition.index + lastPreposition[0].length))
    }
  }

  return normalizeText(
    summary.match(/\b(?:for|in)\s+(Kochi|Kannur(?:\s*\/\s*(?:TVM|Trivandrum))?|TVM|Trivandrum)\b/i)?.[1],
  )
}

const extractLocationFromDetailLines = (detailLines, title, listingSummary) => {
  const locationLine = detailLines
    .find((item) => /\b(?:job|work)?\s*location\s*[–—:-]/i.test(item))

  if (locationLine) {
    const extracted = normalizeText(
      locationLine.replace(/^.*?\b(?:job|work)?\s*location\s*[–—:-]\s*/i, ''),
    )
    if (extracted) return extracted
  }

  const titledLocation = title.match(/\(([^()]*?)\s+location\)/i)?.[1]
  if (titledLocation) {
    return normalizeText(titledLocation)
  }

  const trailingLocation = title.match(/-\s*([A-Za-z/ ,]+)\s*-\s*$/)?.[1]
  if (trailingLocation) {
    return normalizeText(trailingLocation)
  }

  return extractLocationFromListingSummary(listingSummary)
}

const normalizeLocation = (value) => {
  const location = normalizeText(value)
  if (!location) {
    return { location: null, city: null }
  }

  const primaryToken = location.split(',')[0].split('&')[0].split('/')[0]
  const city = normalizeCity(primaryToken)

  return {
    location,
    city: city || null,
  }
}

const buildJobDescription = ({ introLines, sections }) => {
  const lines = [...introLines]

  for (const section of sections) {
    if (!section.heading || section.items.length === 0) continue
    if (lines.length > 0) lines.push('')
    lines.push(section.heading)
    lines.push(...section.items.map((item) => `- ${item}`))
  }

  return lines.length > 0 ? lines.join('\n') : null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Offshore Software Development Company Kerala, India \| Aabasoft\s*<\/title>/i.test(page)
    && /href=["']\/in-en\/career\/["']/i.test(page)
    && /Our Culture/i.test(page)
    && /Campus Placement/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Aabasoft Careers\| Aabasoft\s*<\/title>/i.test(page)
    && /Aabasoft\s*<span>\s*Career\s*<\/span>/i.test(page)
    && /Current\s*<span>\s*Openings\s*<\/span>/i.test(page)
    && /id=["']careers-list-box["']/i.test(page)
    && /href=["'][^"']*\/in-en\/CarrerDetails\/[^"']+["']/i.test(page)
    && />\s*Apply Now\s*</i.test(page)
}

export const extractListingCards = (html) => [...String(html ?? '').matchAll(
  /<article\b[^>]*class=["'][^"']*portfolio-item[^"']*["'][\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>[\s\S]*?<\/article>/gi,
)].map((match) => ({
  department: stripTags(match[1]),
  listingTitle: stripTags(match[2]),
  listingSummary: stripTags(match[3]),
  sourceUrl: toAbsoluteUrl(match[4]),
})).filter((listing) => listing.department && listing.listingTitle && listing.sourceUrl)

export const hasOfficialDetailPageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*[^<]+<\/title>/i.test(page)
    && />\s*Job Details\s*</i.test(page)
    && /<h3 class="career-head">\s*[^<]+<\/h3>/i.test(page)
    && /<form[^>]+action=["']\/in-en\/carrerdetails\/["'][^>]*>/i.test(page)
    && />\s*Send Application\s*</i.test(page)
}

const extractDetailPageData = (html, sourceUrl, { department, fallbackTitle, listingSummary }) => {
  if (!hasOfficialDetailPageSignal(html)) {
    throw new Error('Aabasoft detail page no longer matches the verified first-party surface')
  }

  const title = normalizeText(
    extractMatch(html, /<h3 class="career-head">\s*([\s\S]*?)<\/h3>/i)
      || extractMatch(html, /<title>\s*([\s\S]*?)<\/title>/i)
      || fallbackTitle,
  )

  if (!title) {
    throw new Error('Aabasoft detail page no longer matches the verified first-party surface')
  }

  const introLines = extractIntroLines(html)
  const sections = extractSectionPanels(html)
  const requiredSkills = sections
    .flatMap((section) => section.items)
    .filter((item) => !/\b(?:job|work)?\s*location\s*[–—:-]/i.test(item))
  const { location, city } = normalizeLocation(
    extractLocationFromDetailLines(
      [...introLines, ...sections.flatMap((section) => section.items)],
      title,
      listingSummary,
    ),
  )
  const slug = decodeURIComponent(new URL(sourceUrl).pathname.split('/').filter(Boolean).at(-1) ?? '')

  return {
    title,
    department,
    location,
    city,
    jobId: `${SOURCE}-${slugify(slug)}`,
    requisitionId: `${SOURCE}-${slugify(slug)}`,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills,
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: buildJobDescription({ introLines, sections }),
    companyCareerPage: CAREERS_URL,
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

export const createAabasoftScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Aabasoft verified official homepage no longer matches the trusted first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Aabasoft verified careers page no longer matches the trusted first-party surface')
    }

    const listings = extractListingCards(careersHtml)
    if (listings.length === 0) {
      throw new Error('Aabasoft careers page no longer exposes verified first-party listing cards')
    }

    const jobs = (await Promise.all(listings.map(async (listing) => extractDetailPageData(
      await fetchText(listing.sourceUrl),
      listing.sourceUrl,
      listing,
    ))))
      .sort((left, right) => left.title.localeCompare(right.title) || left.jobId.localeCompare(right.jobId))
      .map((job) => ({
        ...job,
        company: COMPANY,
        source: SOURCE,
        companyDomain: COMPANY_DOMAIN,
        atsPlatform: 'official-company-careers',
        country: 'India',
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: (overrideNow || now)(),
      }))

    if (jobs.length === 0) {
      throw new Error('Aabasoft first-party careers surface no longer yields normalized jobs')
    }

    return jobs
  },
})

export const run = async (options = {}) => createAabasoftScraper().run(options)

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
