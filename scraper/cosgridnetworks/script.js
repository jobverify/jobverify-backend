import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cosgridnetworks'
export const COMPANY = 'COSGrid Networks'
export const HOMEPAGE_URL = 'https://www.cosgrid.com/'
export const CAREERS_URL = 'https://www.cosgrid.com/company/careers'
export const OPENINGS_URL = 'https://www.cosgrid.com/company/careers/openings'
export const COMPANY_DOMAIN = 'cosgrid.com'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const titleCaseEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const compact = normalized.replace(/_/g, '-').toLowerCase()
  if (compact === 'full-time' || compact === 'full time') return 'Full-time'
  if (compact === 'part-time' || compact === 'part time') return 'Part-time'
  if (compact === 'internship') return 'Internship'
  if (compact === 'contract') return 'Contract'

  return normalized
}

const normalizeCountry = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^(in|india)$/i.test(normalized)) return 'India'
  return normalized
}

const appendCountryToLocation = (value, country = 'India') => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (new RegExp(`${country}$`, 'i').test(normalized)) return normalized
  return `${normalized}, ${country}`
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

const extractMetaDescription = (html) => {
  const match = String(html ?? '').match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
  return normalizeWhitespace(match?.[1] ?? null)
}

const extractJsonLdBlocks = (html) => [...String(html ?? '').matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .map((value) => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  })
  .filter(Boolean)

const flattenJsonLdNodes = (nodes) => nodes.flatMap((node) => {
  if (Array.isArray(node)) return flattenJsonLdNodes(node)
  if (Array.isArray(node?.['@graph'])) return flattenJsonLdNodes(node['@graph'])
  return [node]
})

const extractJobPostingNode = (html) => flattenJsonLdNodes(extractJsonLdBlocks(html))
  .find((node) => String(node?.['@type'] ?? '').toLowerCase() === 'jobposting')

const extractHybridSignal = (html) => {
  const text = stripTags(html) || ''
  if (/\bhybrid work model\b/i.test(text) || /\bhybrid\b/i.test(text)) return 'Hybrid'
  if (/\bremote\b/i.test(text)) return 'Remote'
  return null
}

const extractSectionItems = (html, heading) => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(html ?? '').match(
    new RegExp(`<p[^>]*>\\s*${escapedHeading}\\s*<\\/p>([\\s\\S]*?)(?=<div class="mt-5">|<\\/main>)`, 'i'),
  )

  if (!match) return []

  return [...match[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((item) => stripTags(item[1]))
    .filter(Boolean)
}

const extractHeader = (html) => {
  const match = String(html ?? '').match(/<h1[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>\s*\|\s*([^<]+)<\/h1>/i)
  return {
    title: normalizeWhitespace(match?.[1] ?? null),
    department: normalizeWhitespace(match?.[2] ?? null),
  }
}

const extractLocationAndEmployment = (html) => {
  const raw = stripTags(String(html ?? '').match(/<p class="fs-6 mt-3">([\s\S]*?)<\/p>/i)?.[1] ?? null)
  if (!raw) {
    return {
      location: null,
      city: null,
      country: null,
      employmentType: null,
    }
  }

  const employmentMatch = raw.match(/\b(Full-Time|Internship|Part-Time|Contract)\b/i)
  const employmentType = titleCaseEmploymentType(employmentMatch?.[1] ?? null)
  const locationText = employmentMatch ? raw.replace(employmentMatch[0], '').trim() : raw
  const country = 'India'
  const location = appendCountryToLocation(locationText, country)

  return {
    location,
    city: extractCity(location),
    country,
    employmentType,
  }
}

const extractExperienceRequired = (values) => {
  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    const match = normalized?.match(/(\d+\s*(?:\+\s*)?(?:-\s*\d+\s*)?years?)/i)
    if (match?.[1]) {
      return normalizeWhitespace(match[1])
    }
  }

  return null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  const hasLegacyHero = /<h1>\s*COSGrid Networks\s*<\/h1>/i.test(page)
    && /Cyber Resiliency Simplified/i.test(text)
  const hasZ3Hero = /Endpoint Native - Unified SASE Platform/i.test(text)
    && /COSGrid Z3:\s*Cyber-Resiliency Simplified\./i.test(text)
    && /Built on Three Absolutes/i.test(text)

  return /<title>\s*COSGrid \| Cyber Resiliency Simplified - Secure Access &amp; Protection\s*<\/title>/i.test(page)
    && (hasLegacyHero || hasZ3Hero)
    && /href=["']\/company\/careers["']/i.test(page)
}

export const hasOfficialCareersLandingSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Join the COSGrid Team: Build a Brighter Digital Future\s*<\/title>/i.test(page)
    && /<h1>\s*Join the COSGrid Team\s*<\/h1>/i.test(page)
    && /Take a look at our latest job opportunities/i.test(text)
    && /ng-reflect-router-link=["']openings["']/i.test(page)
    && /mailto:careers@cosgrid\.com/i.test(page)
}

export const extractSearchResults = (html) => {
  if (!/<title>\s*COSGrid Networks \| Current Job Openings \| Join Our Team\s*<\/title>/i.test(String(html ?? ''))) {
    throw new Error('COSGrid verified openings page no longer matches the trusted first-party surface')
  }

  const matches = [...String(html ?? '').matchAll(
    /<div class="single-career-container[\s\S]*?<p class="fw-bold fs-6">([\s\S]*?)<\/p>[\s\S]*?<p class="fs-6">([\s\S]*?)<\/p>[\s\S]*?<p class="fs-6">([\s\S]*?)<\/p>[\s\S]*?ng-reflect-router-link="([^"]+)"/gi,
  )]

  if (matches.length === 0) {
    throw new Error('COSGrid verified openings page no longer exposes public job cards')
  }

  return matches.map((match) => {
    const title = normalizeWhitespace(match[1])
    const department = normalizeWhitespace(match[2])
    const employmentType = titleCaseEmploymentType(match[3])
    const slug = normalizeWhitespace(match[4])

    if (!title || !department || !employmentType || !slug) {
      throw new Error('COSGrid verified openings cards changed shape')
    }

    return {
      title,
      department,
      employmentType,
      slug,
      sourceUrl: `${OPENINGS_URL}/${slug}`,
    }
  })
}

export const extractJobDetail = (html, { sourceUrl, fallbackListing } = {}) => {
  const page = String(html ?? '')
  const header = extractHeader(page)

  if (!header.title || !header.department || !/COSGrid Networks is a leading networking and cybersecurity products company\./i.test(page)) {
    throw new Error('COSGrid verified detail surface no longer matches the trusted first-party job page')
  }

  const requiredSkills = extractSectionItems(page, 'Required Skills')
  const requirements = extractSectionItems(page, 'Requirements')
  const metadata = extractLocationAndEmployment(page)
  const jobPosting = extractJobPostingNode(page)
  const jsonLocation = jobPosting?.jobLocation?.address?.addressLocality ?? null
  const country = normalizeCountry(
    jobPosting?.applicantLocationRequirements?.name
      ?? jobPosting?.jobLocation?.address?.addressCountry
      ?? metadata.country,
  )
  const location = appendCountryToLocation(jsonLocation ?? metadata.location, country ?? 'India')
  const description = normalizeWhitespace(jobPosting?.description ?? extractMetaDescription(page))
  const experienceRequired = extractExperienceRequired([
    ...requiredSkills,
    ...requirements,
    header.title,
    fallbackListing?.title,
  ])

  return {
    title: normalizeWhitespace(jobPosting?.title ?? header.title ?? fallbackListing?.title),
    department: header.department ?? fallbackListing?.department ?? null,
    employmentType: titleCaseEmploymentType(jobPosting?.employmentType ?? fallbackListing?.employmentType ?? metadata.employmentType),
    location,
    city: normalizeWhitespace(jsonLocation ?? metadata.city),
    country: country ?? 'India',
    postingDate: normalizeWhitespace(jobPosting?.datePosted ?? null),
    closingDate: normalizeWhitespace(jobPosting?.validThrough ?? null),
    jobDescription: description,
    experienceRequired,
    minimumQualification: requirements.length > 0 ? requirements.join(' ') : null,
    preferredQualification: null,
    requiredSkills,
    remoteStatus: extractHybridSignal(page),
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

export const createCosgridNetworksScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('COSGrid verified official homepage no longer matches the trusted first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersLandingSignal(careersHtml)) {
      throw new Error('COSGrid verified careers landing no longer matches the trusted first-party surface')
    }

    const openingsHtml = await fetchText(OPENINGS_URL)
    const listings = extractSearchResults(openingsHtml)
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)

      try {
        const detail = extractJobDetail(detailHtml, {
          sourceUrl: listing.sourceUrl,
          fallbackListing: listing,
        })

        jobs.push({
          ...detail,
          company: COMPANY,
          source: SOURCE,
          jobId: listing.slug,
          requisitionId: listing.slug,
          sourceUrl: listing.sourceUrl,
          applyUrl: listing.sourceUrl,
          link: listing.sourceUrl,
          scrapedAt: (overrideNow || now)(),
          companyCareerPage: OPENINGS_URL,
          companyDomain: COMPANY_DOMAIN,
          atsPlatform: 'official-company-careers',
        })
      } catch (error) {
        if (/verified detail surface/i.test(String(error?.message ?? error))) {
          continue
        }

        throw error
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createCosgridNetworksScraper().run(options)

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
