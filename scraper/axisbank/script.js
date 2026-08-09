import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'axisbank'
export const COMPANY = 'Axis Bank'
export const OFFICIAL_CAREERS_PAGE_URL = 'https://www.axisbank.com/careers-new'
export const BASE_URL = 'https://axisbank.ripplehire.com'
export const FALLBACK_TOKEN = 'WIXhCuz0XRZ7H0GZCwjJ'
export const CAREER_SOURCE = 'CAREERSITE'
export const SEARCH_PATH = '/candidate/candidatejobsearch'
export const DETAIL_PATH = '/candidate/candidatejobdetail'
export const PUBLIC_LISTINGS_URL = `${BASE_URL}/candidate/?token=${FALLBACK_TOKEN}&source=${CAREER_SOURCE}#list`
export const DEFAULT_PAGE_SIZE = 10
export const FETCH_TIMEOUT_MS = 15000
export const VERIFIED_ON = '2026-08-08'
export const VERIFIED_SURFACE_SUMMARY = 'Verified on Saturday, August 8, 2026 that https://www.axisbank.com/careers-new remained the official Axis Bank careers page and still handed job seekers to the public Ripplehire listings surface at https://axisbank.ripplehire.com/candidate/?token=WIXhCuz0XRZ7H0GZCwjJ&source=CAREERSITE#list. The public Ripplehire search endpoint continued returning live India-facing openings from this environment, but the companion candidatejobdetail endpoint was returning HTTP 500 for sampled job sequences. The scraper therefore now verifies the official careers-page handoff, scrapes the live Ripplehire search feed directly, and falls back to listing-only records whenever the broken detail endpoint cannot be trusted.'
const FOREIGN_LOCATION_PATTERN = /\b(singapore|united states|usa|uk|united kingdom|canada|germany|australia|new zealand|uae|dubai|abu dhabi|saudi|qatar|oman|kuwait)\b/i

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#x2F;/gi, '/')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')

const decodeHtmlAttribute = (value) => decodeHtmlEntities(String(value ?? ''))

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(value)
  return match ? transform(match) : null
}

const extractTagValue = (tagName, value) => extractFirst(
  new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'),
  value,
)

const extractJobBlocks = (xml) => [...String(xml).matchAll(/<jobVoList>\s*<jobSeq>[\s\S]*?<\/jobVoList>/gi)]
  .map((match) => match[0])

const toTitleCase = (value) => value
  .toLowerCase()
  .split(/\s+/)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

const normalizeCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/^pan india$/i.test(normalized)) return 'Pan India'

  const uniqueParts = []
  for (const part of normalized.split(',').map((item) => item.trim()).filter(Boolean)) {
    if (!uniqueParts.some((item) => item.toLowerCase() === part.toLowerCase())) {
      uniqueParts.push(part)
    }
  }

  return uniqueParts
    .map((part) => (/^[A-Z\s]+$/.test(part) ? toTitleCase(part) : part))
    .join(', ')
}

export const isIndiaListing = ({ countryCode, city }) => {
  const normalizedCountry = normalizeWhitespace(countryCode)?.toLowerCase() || ''
  const normalizedCity = normalizeWhitespace(city)?.toLowerCase() || ''

  if (!normalizedCountry && !normalizedCity) return false
  if (normalizedCountry === 'ind' || normalizedCountry === 'india') return true

  const haystack = [normalizedCountry, normalizedCity].filter(Boolean).join(' ')
  return !FOREIGN_LOCATION_PATTERN.test(haystack)
}

const buildLocation = (city) => {
  if (!city || /^pan india$/i.test(city)) return 'India'
  return `${city}, India`
}

const extractParagraphs = (html) => [...decodeHtmlEntities(html).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractRoleProficiencySkills = (descriptionHtml) => {
  const paragraphs = extractParagraphs(descriptionHtml)
  const skills = []
  let inRoleProficiencies = false

  for (const paragraph of paragraphs) {
    if (/^role proficiencies:?$/i.test(paragraph)) {
      inRoleProficiencies = true
      continue
    }

    if (!inRoleProficiencies) continue
    if (/^for successful execution/i.test(paragraph)) continue
    if (/^[a-z][a-z\s]+:$/i.test(paragraph)) break

    const bullet = paragraph.match(/^[ø•*\-]\s*(.+)$/i)
    if (bullet?.[1]) {
      skills.push(bullet[1].trim())
    }
  }

  return skills
}

export const buildSearchRequestPayload = (page = 0) => ({
  page,
  search: '*:*',
  campaignSeq: '',
  token: FALLBACK_TOKEN,
  source: CAREER_SOURCE,
  pagesize: DEFAULT_PAGE_SIZE,
})

export const extractRipplehireCareersHandoff = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const decodedHref = decodeHtmlAttribute(match[1])
    if (!/axisbank\.ripplehire\.com\/candidate\/\?token=/i.test(decodedHref)) continue
    if (!/#(?:list|apply\/job\/\d+)/i.test(decodedHref)) continue

    try {
      const parsed = new URL(decodedHref)
      const token = normalizeWhitespace(parsed.searchParams.get('token'))
      const source = normalizeWhitespace(parsed.searchParams.get('source'))
      if (!token) continue

      return {
        token,
        source: source || CAREER_SOURCE,
        href: parsed.toString(),
      }
    } catch {
      continue
    }
  }

  return null
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = stripTags(html)?.toLowerCase() || ''
  const handoff = extractRipplehireCareersHandoff(html)

  return /<title>\s*careers new\s*<\/title>/i.test(page)
    && normalized.includes('axis bank')
    && normalized.includes('explore opportunities')
    && /upload (?:your )?resume/i.test(normalized)
    && /don't see your preferred role listed here/i.test(normalized)
    && handoff?.token != null
}

export const buildDetailApiUrl = (jobSeq, token = FALLBACK_TOKEN) =>
  `${BASE_URL}${DETAIL_PATH}?token=${token}&jobSeq=${jobSeq}&source=${CAREER_SOURCE}&lang=en`

export const buildDetailUrl = (jobSeq, token = FALLBACK_TOKEN) =>
  `${BASE_URL}/candidate/?token=${token}&source=${CAREER_SOURCE}#detail/job/${jobSeq}`

export const buildApplyUrl = (jobSeq, token = FALLBACK_TOKEN) =>
  `${BASE_URL}/candidate/?token=${token}&source=${CAREER_SOURCE}#apply/job/${jobSeq}`

export const extractSearchSummary = (xml) => ({
  startJobIndex: extractFirst(/<startJobIndex>(\d+)<\/startJobIndex>/i, xml, (match) => Number.parseInt(match[1], 10)),
  pageSize: extractFirst(/<maxJobSize>(\d+)<\/maxJobSize>/i, xml, (match) => Number.parseInt(match[1], 10)),
  totalJobCount: extractFirst(/<totalJobCount>(\d+)<\/totalJobCount>/i, xml, (match) => Number.parseInt(match[1], 10)),
})

export const normalizeEmploymentType = (value, title = '') => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  const normalizedTitle = normalizeWhitespace(title)?.toLowerCase() || ''

  if (normalized) {
    if (/intern|internship|apprentice/.test(normalized)) return 'Internship'
    if (/fixed term|temporary|contract/.test(normalized)) return 'Contract'
    if (/hybrid|remote|on[\s-]*site|onsite|regular|permanent|full[\s-]*time/.test(normalized)) {
      return 'Full-time'
    }
  }

  if (/intern|internship|apprentice/.test(normalizedTitle)) return 'Internship'
  if (/contract|contractor|freelance/.test(normalizedTitle)) return 'Contract'
  return 'Full-time'
}

export const extractSearchResults = (xml, token = FALLBACK_TOKEN) => extractJobBlocks(xml)
  .map((block) => {
    const jobSeq = normalizeWhitespace(extractTagValue('jobSeq', block))
    const title = normalizeWhitespace(extractTagValue('jobTitle', block))
    const countryCode = normalizeWhitespace(extractTagValue('jobLocation', block))
    const city = normalizeCity(extractTagValue('locations', block))
    const requisitionId = normalizeWhitespace(extractTagValue('jobId', block))
    const experienceRequired = normalizeWhitespace(extractTagValue('jobReqExp', block))
    const postingDate = normalizeWhitespace(extractTagValue('jobPostingDate', block))

    if (!jobSeq || !title || !city) return null
    if (!isIndiaListing({ countryCode, city })) return null

    return {
      title,
      location: buildLocation(city),
      city: /^pan india$/i.test(city) ? null : city,
      jobId: jobSeq,
      requisitionId: requisitionId || jobSeq,
      sourceUrl: buildDetailUrl(jobSeq, token),
      applyUrl: buildApplyUrl(jobSeq, token),
      experienceRequired,
      postingDate,
      department: null,
    }
  })
  .filter(Boolean)

export const extractJobDetail = (xml, listing = {}, token = FALLBACK_TOKEN) => {
  const jobBlock = extractFirst(/<jobVO>([\s\S]*?)<\/jobVO>/i, xml)
  const title = normalizeWhitespace(extractTagValue('jobTitle', jobBlock)) || listing.title || null
  const jobSeq = normalizeWhitespace(extractTagValue('jobSeq', jobBlock)) || listing.jobId || null
  const requisitionId = normalizeWhitespace(extractTagValue('jobId', jobBlock)) || listing.requisitionId || jobSeq
  const city = normalizeCity(extractTagValue('locations', jobBlock)) || listing.city || null
  const department = normalizeWhitespace(extractTagValue('bussinessUnit', jobBlock)) || listing.department || null
  const experienceRequired = normalizeWhitespace(extractTagValue('jobReqExp', jobBlock)) || listing.experienceRequired || null
  const employmentType = normalizeEmploymentType(extractTagValue('jobTypeCustom3', jobBlock), title)
  const descriptionHtml = extractTagValue('jobDesc', jobBlock)
  const postingDate = normalizeWhitespace(extractFirst(
    /<publishDetails>[\s\S]*?<CAREER_SITE>([\s\S]*?)<\/CAREER_SITE>/i,
    jobBlock,
  ))
    || normalizeWhitespace(extractTagValue('jobPostingDate', jobBlock))
    || listing.postingDate
    || null

  return {
    title,
    location: listing.location || buildLocation(city),
    city,
    jobId: jobSeq,
    requisitionId,
    employmentType,
    experienceRequired,
    department,
    jobDescription: stripTags(descriptionHtml),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractRoleProficiencySkills(descriptionHtml),
    postingDate,
    closingDate: null,
    applyUrl: listing.applyUrl || (jobSeq ? buildApplyUrl(jobSeq, token) : null),
    sourceUrl: listing.sourceUrl || (jobSeq ? buildDetailUrl(jobSeq, token) : null),
  }
}

export const createListingOnlyJob = (listing = {}) => ({
  title: listing.title || null,
  location: listing.location || null,
  city: listing.city || null,
  jobId: listing.jobId || null,
  requisitionId: listing.requisitionId || listing.jobId || null,
  employmentType: normalizeEmploymentType(null, listing.title),
  experienceRequired: listing.experienceRequired || null,
  department: listing.department || null,
  jobDescription: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: listing.postingDate || null,
  closingDate: null,
  applyUrl: listing.applyUrl || null,
  sourceUrl: listing.sourceUrl || null,
})

export const isBrokenDetailSurfaceError = (error) => {
  const message = String(error?.message ?? error ?? '')
  return /HTTP 500 .*candidatejobdetail/i.test(message)
    || /HTTP 404 .*candidatejobdetail/i.test(message)
    || /timed out .*candidatejobdetail/i.test(message)
}

const defaultFetchText = async (url, options = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new Error(`Fetch timed out after ${FETCH_TIMEOUT_MS}ms for ${url}`)), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        Accept: 'application/xml,text/xml,text/html;q=0.9,*/*;q=0.8',
        ...(options.headers || {}),
      },
      body: options.body,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }

    return response.text()
  } finally {
    clearTimeout(timeoutId)
  }
}

export const createAxisBankScraper = ({ fetchText = defaultFetchText } = {}) => ({
  run: async ({ fetchText: overrideFetchText, maxPages: overrideMaxPages } = {}) => {
    const fetchImpl = overrideFetchText || fetchText
    const jobs = []
    const seenJobIds = new Set()
    const officialCareersHtml = await fetchImpl(OFFICIAL_CAREERS_PAGE_URL)
    if (!hasOfficialCareersSignal(officialCareersHtml)) {
      throw new Error('Axis Bank verified official careers page no longer matches the known Ripplehire handoff surface')
    }

    const careersHandoff = extractRipplehireCareersHandoff(officialCareersHtml)
    const token = careersHandoff?.token || FALLBACK_TOKEN
    const maxPages = Number.isInteger(overrideMaxPages)
      ? overrideMaxPages
      : Number.isInteger(config.maxPages)
        ? config.maxPages
        : Number.POSITIVE_INFINITY
    let detailEndpointBroken = false

    for (let page = 0; page < maxPages; page += 1) {
      const payload = {
        ...buildSearchRequestPayload(page),
        token,
      }
      const body = new URLSearchParams({
        careerSiteUrlParams: JSON.stringify(payload),
        lang: 'en',
      })
      const listingXml = await fetchImpl(`${BASE_URL}${SEARCH_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body,
      })
      const listings = extractSearchResults(listingXml, token)
      const summary = extractSearchSummary(listingXml)

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        let detail = createListingOnlyJob(listing)
        if (!detailEndpointBroken) {
          try {
            const detailXml = await fetchImpl(buildDetailApiUrl(listing.jobId, token))
            detail = extractJobDetail(detailXml, listing, token)
          } catch (error) {
            if (!isBrokenDetailSurfaceError(error)) {
              throw error
            }

            detailEndpointBroken = true
            detail = createListingOnlyJob(listing)
          }
        }

        jobs.push({
          jobId: detail.jobId || listing.jobId,
          requisitionId: detail.requisitionId || listing.requisitionId,
          title: detail.title || listing.title,
          company: COMPANY,
          department: detail.department || listing.department,
          location: detail.location || listing.location,
          city: detail.city || listing.city,
          link: detail.applyUrl || listing.applyUrl,
          applyUrl: detail.applyUrl || listing.applyUrl,
          sourceUrl: detail.sourceUrl || listing.sourceUrl,
          source: SOURCE,
          employmentType: detail.employmentType,
          experienceRequired: detail.experienceRequired,
          jobDescription: detail.jobDescription,
          minimumQualification: detail.minimumQualification,
          preferredQualification: detail.preferredQualification,
          requiredSkills: detail.requiredSkills,
          postingDate: detail.postingDate || listing.postingDate,
          closingDate: detail.closingDate,
          scrapedAt: new Date().toISOString(),
        })
      }

      const totalJobCount = summary.totalJobCount || 0
      const pageSize = summary.pageSize || DEFAULT_PAGE_SIZE
      const nextStartIndex = (summary.startJobIndex ?? 0) + pageSize
      if (nextStartIndex >= totalJobCount || listings.length === 0) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createAxisBankScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
    process.exit(0)
  }
}
