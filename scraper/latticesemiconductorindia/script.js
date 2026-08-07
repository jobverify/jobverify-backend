import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserNetworkFallback } from '../../scraper-support/shared/browserNetworkFallback.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { LATTICE_SEMICONDUCTOR_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = LATTICE_SEMICONDUCTOR_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const OFFICIAL_CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const SEARCH_INTRO_URL = PROVIDER_METADATA.indiaJobsIntroUrl
export const SEARCH_WRAPPER_URL = PROVIDER_METADATA.indiaJobsSearchWrapperUrl
export const SEARCH_IFRAME_URL = PROVIDER_METADATA.indiaJobsSearchIframeUrl
export const OFFICIAL_JOB_DETAIL_EXAMPLE_URL = PROVIDER_METADATA.officialJobDetailExampleUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const ICIMS_HOST = 'https://careers-latticesemi.icims.com'
const PINNED_SEARCH_INTRO_PARAMS = new Map([
  ['bga', 'true'],
  ['hashed', '-625919477'],
  ['height', '500'],
  ['jan1offset', '-480'],
  ['jun1offset', '-420'],
  ['mobile', 'false'],
  ['needsRedirect', 'false'],
  ['width', '1378'],
])

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/&#8211;|&#x2013;|&ndash;/gi, '-')
  .replace(/&#8212;|&#x2014;|&mdash;/gi, '-')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim(),
)
  || null

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(?:div|dd|dt|h[1-6]|li|p|section|span|ul|ol)>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const unique = (values) => [...new Set(values.filter(Boolean))]

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const canonicalizeTitleForComparison = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  || null

const toAbsoluteUrl = (value, baseUrl = ICIMS_HOST) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return normalized
  }
}

const normalizeUrl = (value, baseUrl = ICIMS_HOST) => {
  const absoluteUrl = toAbsoluteUrl(value, baseUrl)
  if (!absoluteUrl) return null

  try {
    const parsed = new URL(absoluteUrl)
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return absoluteUrl
  }
}

const hasPinnedSearchIntroUrl = (value) => {
  const absoluteUrl = toAbsoluteUrl(value, OFFICIAL_CAREERS_PAGE_URL)
  if (!absoluteUrl) return false

  try {
    const parsed = new URL(absoluteUrl)
    if (`${parsed.origin}${parsed.pathname}` !== `${ICIMS_HOST}/jobs/intro`) {
      return false
    }

    return [...PINNED_SEARCH_INTRO_PARAMS.entries()].every(([key, expectedValue]) => (
      parsed.searchParams.get(key) === expectedValue
    ))
  } catch {
    return false
  }
}

const extractField = (html, label) => {
  const source = String(html ?? '')
  const escapedLabel = escapeRegex(label)
  const definitionMatch = source.match(new RegExp(
    `<dt[^>]*>[\\s\\S]*?${escapedLabel}[\\s\\S]*?<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`,
    'i',
  ))

  return stripTags(definitionMatch?.[1])
}

const extractListingLocationValue = (html = '') => {
  const structuredLocation = extractField(html, 'Job Locations')
  if (structuredLocation) {
    return structuredLocation
  }

  const headerMatch = String(html ?? '').match(
    /field-label">\s*Job Locations\s*<\/span>\s*<span[^>]*>\s*([^<]+?)\s*<\/span>/i,
  )

  return normalizeWhitespace(String(headerMatch?.[1] ?? '').replace(/^\|\s*/, ''))
}

const extractJobPathInfo = (value = '') => {
  const absoluteUrl = toAbsoluteUrl(value)
  if (!absoluteUrl) {
    return { jobId: null, slug: null }
  }

  try {
    const parsed = new URL(absoluteUrl)
    const match = parsed.pathname.match(/\/jobs\/(\d+)\/([^/?#]+)\/job/i)
    if (!match) {
      return { jobId: null, slug: null }
    }

    return {
      jobId: normalizeWhitespace(match[1]),
      slug: normalizeWhitespace(match[2]),
    }
  } catch {
    return { jobId: null, slug: null }
  }
}

const normalizeIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      city: null,
      location: null,
    }
  }

  const match = normalized.match(/^IN-[A-Z]{2}-(.+)$/i)
  if (match) {
    const city = normalizeWhitespace(match[1])
    return {
      city,
      location: city ? `${city}, India` : null,
    }
  }

  const city = normalizeWhitespace(normalized.split(',')[0])
  return {
    city,
    location: city ? `${city}, India` : normalized,
  }
}

const isIndiaLocation = (value) => /^IN-[A-Z]{2}-/i.test(normalizeWhitespace(value) || '')

const extractJsonLdJobPosting = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1])
      if (Array.isArray(parsed)) {
        const jobPosting = parsed.find((item) => item?.['@type'] === 'JobPosting')
        if (jobPosting) return jobPosting
      } else if (parsed?.['@type'] === 'JobPosting') {
        return parsed
      }
    } catch {
      continue
    }
  }

  return null
}

const extractDescriptionSections = (html = '') => {
  const sectionPattern = /<h2[^>]*>\s*([^<]+?)\s*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/gi
  const sections = new Map()

  for (const match of String(html ?? '').matchAll(sectionPattern)) {
    const heading = normalizeWhitespace(match[1])?.toLowerCase()
    if (!heading) continue
    sections.set(heading, match[2])
  }

  return sections
}

const extractListItems = (html = '') => [...String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const buildCanonicalApplyUrl = (rawApplyUrl, fallbackUrl) => {
  const normalized = normalizeUrl(rawApplyUrl, ICIMS_HOST)
  if (!normalized) return fallbackUrl || null

  try {
    const parsed = new URL(normalized)
    const canonical = new URL(parsed.pathname, parsed.origin)
    canonical.searchParams.set('apply', 'yes')

    const hashed = parsed.searchParams.get('hashed')
    if (hashed) {
      canonical.searchParams.set('hashed', hashed)
    }

    canonical.searchParams.set('mode', parsed.searchParams.get('mode') || 'apply')
    return canonical.toString()
  } catch {
    return normalized
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const buildSearchUrl = (pageIndex = 0) => (
  pageIndex > 0
    ? `${ICIMS_HOST}/jobs/search?pr=${pageIndex}&in_iframe=1&searchRelation=keyword_all`
    : SEARCH_IFRAME_URL
)

export const buildDetailUrl = ({ jobId, slug } = {}) => (
  jobId && slug ? `${ICIMS_HOST}/jobs/${jobId}/${slug}/job` : null
)

export const buildDetailFetchUrl = ({ jobId, slug } = {}) => {
  const detailUrl = buildDetailUrl({ jobId, slug })
  return detailUrl ? `${detailUrl}?in_iframe=1` : null
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const source = String(html ?? '')
  return /<title>\s*Lattice Semiconductor \| Careers \| Join the FPGA Leader\s*<\/title>/i.test(source)
    && /Search Job Openings/i.test(source)
    && hasPinnedSearchIntroUrl(extractSearchIntroUrl(source))
}

export const extractSearchIntroUrl = (html = '') => {
  const match = String(html ?? '').match(
    /href=["'](https:\/\/careers-latticesemi\.icims\.com\/jobs\/intro\?[^"']+)["'][^>]*>\s*Search Job Openings/i,
  )
  if (!match?.[1]) {
    return null
  }

  return hasPinnedSearchIntroUrl(match[1])
    ? SEARCH_INTRO_URL
    : normalizeUrl(match[1], OFFICIAL_CAREERS_PAGE_URL)
}

export const hasOfficialSearchIntroSignal = (html = '') => {
  const source = String(html ?? '')
  return (
    /<title>\s*Lattice Semiconductor Corp\. \| Careers Center \| Welcome\s*<\/title>/i.test(source)
    && /view all open positions/i.test(source)
    && /MH Pune IN/i.test(source)
  ) || /<title>\s*iCIMS Careers Portal\s*<\/title>/i.test(source)
}

export const extractSearchWrapperUrl = (html = '') => {
  const match = String(html ?? '').match(
    /href=["'](https:\/\/careers-latticesemi\.icims\.com\/jobs\/search\?hashed=-625919477&ss=1)["'][^>]*>\s*view all open positions/i,
  )
  return normalizeUrl(match?.[1], SEARCH_INTRO_URL)
}

export const hasOfficialListingsPageSignal = (html = '') => {
  const source = String(html ?? '')
  return /<title>\s*Job Listings at Lattice Semiconductor Corp\.\s*<\/title>/i.test(source)
    && /\biCIMS_JobsTable\b/i.test(source)
    && /careers-latticesemi\.icims\.com\/jobs\/\d+\//i.test(source)
    && /IN-[A-Z]{2}-[A-Za-z]/i.test(source)
}

export const extractNextPageUrl = (html = '') => {
  const source = String(html ?? '')
  const nextMatch = source.match(/<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i)
  return nextMatch ? normalizeUrl(nextMatch[1], ICIMS_HOST) : null
}

export const extractJobCards = (html = '') => {
  const cardPattern = /<li[^>]*class=["'][^"']*iCIMS_JobCardItem[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi

  return [...String(html ?? '').matchAll(cardPattern)]
    .map((match) => {
      const cardHtml = match[1]
      const locationValue = extractListingLocationValue(cardHtml)
      if (!isIndiaLocation(locationValue)) return null

      const linkMatch = cardHtml.match(
        /<a[^>]+href=["']([^"']*\/jobs\/\d+\/[^"'?#\s<>]+\/job(?:\?[^"']*)?)["'][^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i,
      )
      const { jobId, slug } = extractJobPathInfo(linkMatch?.[1])
      const title = stripTags(linkMatch?.[2])
      const { city, location } = normalizeIndiaLocation(locationValue)

      if (!jobId || !slug || !title || !city || !location) {
        return null
      }

      return {
        title,
        company: COMPANY_NAME,
        department: extractField(cardHtml, 'Category'),
        location,
        city,
        country: 'India',
        jobId,
        requisitionId: extractField(cardHtml, 'ID'),
        sourceUrl: buildDetailUrl({ jobId, slug }),
        applyUrl: buildDetailUrl({ jobId, slug }),
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: stripTags(
          cardHtml.match(/<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1],
        ),
      }
    })
    .filter(Boolean)
}

export const extractJobDetail = (html = '', listing = {}) => {
  const jsonLd = extractJsonLdJobPosting(html)
  const descriptionSections = extractDescriptionSections(jsonLd?.description)
  const overview = stripTags(descriptionSections.get('overview'))
  const responsibilities = extractListItems(descriptionSections.get('responsibilities')).join(' ')
  const qualifications = extractListItems(descriptionSections.get('qualifications'))

  const rawApplyMatch = String(html ?? '').match(
    /<a[^>]+href=["']([^"']*mode=apply[^"']*apply=yes[^"']*|[^"']*apply=yes[^"']*mode=apply[^"']*)["'][^>]*(?:class=["'][^"']*iCIMS_ApplyOnlineButton[^"']*["']|title=["']Apply now["'])/i,
  )

  return {
    title: stripTags(
      String(html ?? '').match(/<h1[^>]*class=["'][^"']*iCIMS_Header[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1],
    ) || normalizeWhitespace(jsonLd?.title) || listing.title || null,
    company: listing.company || COMPANY_NAME,
    department: extractField(html, 'Category') || listing.department || null,
    location: listing.location || normalizeIndiaLocation(extractField(html, 'Job Locations')).location || null,
    city: listing.city || normalizeIndiaLocation(extractField(html, 'Job Locations')).city || null,
    country: listing.country || 'India',
    jobId: listing.jobId || null,
    requisitionId: extractField(html, 'ID') || listing.requisitionId || null,
    sourceUrl: listing.sourceUrl || null,
    applyUrl: buildCanonicalApplyUrl(rawApplyMatch?.[1], listing.applyUrl || listing.sourceUrl),
    employmentType: extractField(html, 'Position Type') || listing.employmentType || null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: unique(qualifications),
    postingDate: normalizeWhitespace(jsonLd?.datePosted) || null,
    closingDate: null,
    jobDescription: normalizeWhitespace(
      [overview, responsibilities, qualifications.join(' ')]
        .filter(Boolean)
        .join(' '),
    ) || listing.jobDescription || null,
  }
}

const hasVerifiedDetailPageSignal = (html = '', listing = {}) => {
  const jsonLd = extractJsonLdJobPosting(html)
  const detail = extractJobDetail(html, listing)

  return /<h1[^>]*class=["'][^"']*iCIMS_Header[^"']*["'][^>]*>/i.test(String(html ?? ''))
    && jsonLd?.['@type'] === 'JobPosting'
    && canonicalizeTitleForComparison(jsonLd?.title) === canonicalizeTitleForComparison(detail.title)
    && normalizeWhitespace(jsonLd?.datePosted)
    && Boolean(detail.applyUrl)
    && /[?&]apply=yes&hashed=[^&]+&mode=apply$/i.test(detail.applyUrl)
}

export const createLatticeSemiconductorIndiaScraper = ({
  fetchText = defaultFetchText,
  now = () => new Date().toISOString(),
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText: overrideFetchText,
    fetchBrowserText,
    maxJobs: overrideMaxJobs = maxJobs,
  } = {}) {
    const fetchTextImpl = overrideFetchText || fetchText
    const browserFallback = createBrowserNetworkFallback({
      fetchText: fetchTextImpl,
      fetchBrowserText,
      userAgent: USER_AGENT,
      browserSessionOptions: {
        timeoutMs: 90000,
        settleTimeMs: 12000,
        ignoreHTTPSErrors: true,
      },
    })

    try {
      const careersHtml = await browserFallback.fetchText(OFFICIAL_CAREERS_PAGE_URL)

      if (!hasOfficialCareersPageSignal(careersHtml)) {
        throw new Error('Lattice Semiconductor India verified first-party careers page no longer matches the pinned public surface')
      }

      if (extractSearchIntroUrl(careersHtml) !== SEARCH_INTRO_URL) {
        throw new Error('Lattice Semiconductor India verified first-party careers page no longer points to the pinned iCIMS intro')
      }

      const introHtml = await browserFallback.fetchText(SEARCH_INTRO_URL)
      const extractedSearchWrapperUrl = extractSearchWrapperUrl(introHtml)
      if (
        !hasOfficialSearchIntroSignal(introHtml)
        || (extractedSearchWrapperUrl && extractedSearchWrapperUrl !== SEARCH_WRAPPER_URL)
      ) {
        throw new Error('Lattice Semiconductor India verified iCIMS intro no longer matches the pinned wrapper handoff')
      }

      const jobs = []
      const seenJobIds = new Set()
      const visitedPages = new Set()
      let nextPageUrl = buildSearchUrl()

      while (nextPageUrl && !visitedPages.has(nextPageUrl)) {
        visitedPages.add(nextPageUrl)
        const listingHtml = await browserFallback.fetchText(nextPageUrl)

        if (!hasOfficialListingsPageSignal(listingHtml)) {
          throw new Error('Lattice Semiconductor India verified India iCIMS listings page no longer matches the pinned public jobs surface')
        }

        for (const listing of extractJobCards(listingHtml)) {
          if (!listing.jobId || seenJobIds.has(listing.jobId)) {
            continue
          }

          seenJobIds.add(listing.jobId)
          const { jobId, slug } = extractJobPathInfo(listing.sourceUrl)
          const detailHtml = await browserFallback.fetchText(buildDetailFetchUrl({ jobId, slug }))

          if (!hasVerifiedDetailPageSignal(detailHtml, listing)) {
            throw new Error(`Lattice Semiconductor India verified Lattice Semiconductor India iCIMS detail page no longer matches the pinned contract: ${listing.sourceUrl}`)
          }

          const detail = extractJobDetail(detailHtml, listing)
          jobs.push({
            ...detail,
            source: SOURCE,
            link: detail.applyUrl || detail.sourceUrl,
            scrapedAt: now(),
          })

          if (overrideMaxJobs && jobs.length >= overrideMaxJobs) {
            return jobs
          }
        }

        nextPageUrl = extractNextPageUrl(listingHtml)
      }

      return jobs
    } finally {
      await browserFallback.close()
    }
  },
})

export const run = async (options = {}) => createLatticeSemiconductorIndiaScraper().run(options)

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
