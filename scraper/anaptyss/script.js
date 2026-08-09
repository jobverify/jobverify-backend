import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ANAPTYSS_CATALOG, VERIFIED_JOB_DETAIL_URLS } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ANAPTYSS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_LANDING_URL = PROVIDER_METADATA.careersLandingUrl
export const JOBS_URL = PROVIDER_METADATA.companyCareerPage
export const SITEMAP_URL = PROVIDER_METADATA.sitemapUrl
export const JOB_POST_SITEMAP_URL = PROVIDER_METADATA.jobPostSitemapUrl
export const SHARED_APPLY_PAGE_URL = PROVIDER_METADATA.sharedApplyPageUrl
export const VERIFIED_JOB_DETAIL_URLS_CONST = [...VERIFIED_JOB_DETAIL_URLS]
export { VERIFIED_JOB_DETAIL_URLS_CONST as VERIFIED_JOB_DETAIL_URLS }

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const SECTION_HEADINGS = [
  'About the Role',
  'Job Description',
  'Educational Qualifications',
  'Experience',
  'Skills',
  'Perks and Benefits',
  'Training Support',
]

const MONTH_LOOKUP = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#8211;|&#x2013;|&ndash;/gi, '–')
  .replace(/&#8212;|&#x2014;|&mdash;/gi, '—')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeComparableTitle = (value) => normalizeWhitespace(value)
  ?.replace(/[–—]/g, '-')

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<(p|div|section|article|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeUrl = (value) => String(value ?? '').replace(/\/+$/, '')

const buildJobIdFromUrl = (url) => {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '')
    return pathname.split('/').pop() || null
  } catch {
    return null
  }
}

const escapeRegExp = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

const formatIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return /\bIndia\b/i.test(normalized) ? normalized : `${normalized}, India`
}

const deriveCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const [firstSegment] = normalized.split('/')
  return normalizeWhitespace(firstSegment?.split(',')[0])
}

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1]) || null
}

const extractLabeledValue = (html = '', label) => {
  const match = String(html ?? '').match(
    new RegExp(`<span[^>]*class=["'][^"']*spn1[^"']*["'][^>]*>\\s*${escapeRegExp(label)}\\s*<\\/span>\\s*<span[^>]*class=["'][^"']*spn2[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`, 'i'),
  )

  return stripTags(match?.[1]) || null
}

const parseOpenedDate = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null

  const match = normalized.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i)
  if (!match) return null

  const [, day, monthName, year] = match
  const month = MONTH_LOOKUP[monthName]
  if (!month) return null

  return `${year}-${month}-${day.padStart(2, '0')}`
}

const extractSectionTextByHeading = (html = '', heading) => {
  const match = String(html ?? '').match(
    new RegExp(
      `<h2[^>]*>\\s*${escapeRegExp(heading)}\\s*<\\/h2>[\\s\\S]*?<div[^>]*class=["'][^"']*job-desc-lists[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`,
      'i',
    ),
  )

  return stripTags(match?.[1]) || null
}

export const hasOfficialHomepageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = stripTags(rawHtml) || ''

  return extractTitle(rawHtml) === 'Digital Knowledge Operations | Anaptyss Inc.'
    && normalized.includes('Digital Knowledge Operations')
    && normalized.includes('Life @ Anaptyss')
    && /href=["'](?:https:\/\/www\.anaptyss\.com)?\/careers\/["']/i.test(rawHtml)
}

export const hasCareersLandingSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = stripTags(rawHtml) || ''

  return extractTitle(rawHtml) === 'Careers - Anaptyss Inc.'
    && normalized.includes('Come, join us and make yourself a rewarding career.')
    && normalizeUrl(extractJobsPageUrl(rawHtml)) === normalizeUrl(JOBS_URL)
}

export const extractJobsPageUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1]
    const label = stripTags(match[2])
    if (label !== 'Explore Opportunities') continue

    return toAbsoluteUrl(href, CAREERS_LANDING_URL)
  }

  return null
}

export const hasJobsPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = stripTags(rawHtml) || ''

  return extractTitle(rawHtml) === 'Jobs - Anaptyss Inc.'
    && normalized.includes('Current Openings')
    && /View More/i.test(rawHtml)
    && extractJobCards(rawHtml).length > 0
}

export const extractJobPostUrlsFromSitemap = (xml = '') => {
  const foundUrls = [...String(xml ?? '').matchAll(/https:\/\/www\.anaptyss\.com\/job-post\/[^<\s]+/gi)]
    .map((match) => normalizeUrl(match[0]))

  return VERIFIED_JOB_DETAIL_URLS.filter((url) => foundUrls.includes(normalizeUrl(url)))
}

export const extractJobCards = (html = '') =>
  String(html ?? '')
    .split('<div class="job-profile-item job-shadow">')
    .slice(1)
    .map((chunk) => {
      const titleMatch = chunk.match(/<h4>([\s\S]*?)<\/h4>/i)
      const topListMatches = [...chunk.matchAll(/<li>([\s\S]*?)<\/li>/gi)]
      const detailUrlMatch = chunk.match(/<a href="(https:\/\/www\.anaptyss\.com\/job-post\/[^"]+\/)"[^>]*>View More<\/a>/i)

      if (!titleMatch || topListMatches.length < 2 || !detailUrlMatch) {
        return null
      }

      return {
        title: stripTags(titleMatch[1]),
        jobType: stripTags(topListMatches[0][1]),
        location: stripTags(topListMatches[1][1]),
        department: extractLabeledValue(chunk, 'Industry'),
        experience: extractLabeledValue(chunk, 'Work Experience'),
        dateOpened: extractLabeledValue(chunk, 'Date Opened'),
        country: extractLabeledValue(chunk, 'Country'),
        detailUrl: detailUrlMatch[1],
      }
    })
    .filter(Boolean)

export const extractApplyUrl = (html = '') => {
  const match = String(html ?? '').match(
    /href=["'](https:\/\/www\.anaptyss\.com\/apply-now\/\?post=[^"']+)["'][^>]*>(?:Apply Now|Apply Now )<\/a>/i,
  )

  return match?.[1] ? decodeHtmlEntities(match[1]).trim() : null
}

export const extractDetailDescription = (html = '') => {
  const parts = SECTION_HEADINGS
    .map((heading) => {
      const text = extractSectionTextByHeading(html, heading)
      return text ? `${heading}: ${text}` : null
    })
    .filter(Boolean)

  return parts.length > 0 ? parts.join(' ') : null
}

const hasVerifiedDetailSurface = (html = '', card = {}) => {
  const applyUrl = extractApplyUrl(html)
  const description = extractDetailDescription(html)
  const detailTitle = extractTitle(html)

  return normalizeComparableTitle(detailTitle) === normalizeComparableTitle(`${card.title} - Anaptyss Inc.`)
    && /Job Information/i.test(String(html ?? ''))
    && /About the Role/i.test(String(html ?? ''))
    && /Qualifications/i.test(String(html ?? ''))
    && applyUrl?.startsWith(SHARED_APPLY_PAGE_URL)
    && description !== null
}

const mapCardToJob = (card, detailHtml, now) => ({
  title: card.title,
  company: COMPANY,
  department: card.department,
  location: formatIndiaLocation(card.location),
  city: deriveCity(card.location),
  country: 'India',
  jobId: buildJobIdFromUrl(card.detailUrl),
  requisitionId: null,
  sourceUrl: card.detailUrl,
  applyUrl: extractApplyUrl(detailHtml),
  employmentType: card.jobType,
  experienceRequired: card.experience,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: parseOpenedDate(card.dateOpened),
  closingDate: null,
  jobDescription: extractDetailDescription(detailHtml),
  source: SOURCE,
  link: extractApplyUrl(detailHtml),
  scrapedAt: now(),
})

export const createAnaptyssScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (
      homepage.status !== 200
      || normalizeUrl(homepage.url) !== normalizeUrl(HOMEPAGE_URL)
      || !hasOfficialHomepageSignal(homepage.html)
    ) {
      throw new Error('Anaptyss verified homepage no longer matches the known first-party surface')
    }

    const careersLanding = await fetchPage(CAREERS_LANDING_URL)
    if (
      careersLanding.status !== 200
      || normalizeUrl(careersLanding.url) !== normalizeUrl(CAREERS_LANDING_URL)
      || !hasCareersLandingSignal(careersLanding.html)
    ) {
      throw new Error('Anaptyss verified careers landing page no longer matches the known first-party surface')
    }

    const jobsPage = await fetchPage(JOBS_URL)
    if (
      jobsPage.status !== 200
      || normalizeUrl(jobsPage.url) !== normalizeUrl(JOBS_URL)
      || !hasJobsPageSignal(jobsPage.html)
    ) {
      throw new Error('Anaptyss verified jobs page no longer matches the known first-party surface')
    }

    const sitemapPage = await fetchPage(SITEMAP_URL)
    if (
      sitemapPage.status !== 200
      || !/https:\/\/www\.anaptyss\.com\/job_post-sitemap\.xml/i.test(sitemapPage.html)
    ) {
      throw new Error('Anaptyss verified sitemap index no longer matches the known first-party surface')
    }

    const jobPostSitemapPage = await fetchPage(JOB_POST_SITEMAP_URL)
    const sitemapJobUrls = extractJobPostUrlsFromSitemap(jobPostSitemapPage.html)
    if (
      jobPostSitemapPage.status !== 200
      || JSON.stringify(sitemapJobUrls) !== JSON.stringify(VERIFIED_JOB_DETAIL_URLS)
    ) {
      throw new Error('Anaptyss verified job-post sitemap no longer matches the known first-party surface')
    }

    const cards = extractJobCards(jobsPage.html)
    const detailUrls = cards.map((card) => card.detailUrl)

    if (JSON.stringify(detailUrls) !== JSON.stringify(VERIFIED_JOB_DETAIL_URLS)) {
      throw new Error('Anaptyss verified jobs page no longer matches the known first-party surface')
    }

    const jobs = []

    for (const card of cards) {
      const detailPage = await fetchPage(card.detailUrl)

      if (
        detailPage.status !== 200
        || normalizeUrl(detailPage.url) !== normalizeUrl(card.detailUrl)
        || !hasVerifiedDetailSurface(detailPage.html, card)
      ) {
        throw new Error(`Anaptyss detail page surface changed: ${card.detailUrl}`)
      }

      jobs.push(mapCardToJob(card, detailPage.html, now))
    }

    return jobs
  },
})

export const run = async (options = {}) => createAnaptyssScraper(options).run(options)

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
