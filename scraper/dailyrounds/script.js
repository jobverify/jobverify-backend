import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'dailyrounds'
export const COMPANY = 'Daily Rounds'
export const COMPANY_DOMAIN = 'dailyrounds.org'
export const VERIFIED_AT = '2026-07-14'
export const HOMEPAGE_URL = 'https://dailyrounds.org/'
export const CAREERS_URL = 'https://dailyrounds.org/careers'
export const DOCTOR_CAREERS_URL = 'https://dailyrounds.org/careers/doctor'
export const CAREERS_API_URL = 'https://dailyrounds.org/api/careers'
export const DOCTOR_CAREERS_API_URL = 'https://dailyrounds.org/api/careers/doctor'
export const CAREERS_PROFILE_API_BASE_URL = 'https://dailyrounds.org/api/careers/profile'
export const DOCTOR_PROFILE_API_BASE_URL = 'https://dailyrounds.org/api/careers/doctor_profile'
export const CAREERS_PROFILE_PAGE_BASE_URL = 'https://dailyrounds.org/careers/profile'
export const DOCTOR_PROFILE_PAGE_BASE_URL = 'https://dailyrounds.org/careers/doctor_profile'
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
export const SCRAPER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  companyCareerPage: CAREERS_URL,
  companyDomain: COMPANY_DOMAIN,
  countryFilter: 'India',
  atsPlatform: 'official-company-careers',
  paginationStrategy: 'verified-careers-pages-plus-first-party-json-apis',
  extractionStrategy:
    'verified-official-homepage+verified-careers-pages+same-origin-first-party-listing-apis+same-origin-first-party-detail-apis',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
}

const DETAIL_PAYLOAD_ERROR_MESSAGE =
  'Daily Rounds detail payload no longer matches the verified first-party API shape'
const NO_VERIFIED_JOB_DETAILS_ERROR_MESSAGE =
  'Daily Rounds no verified job details remain on the trusted first-party surface'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&lsquo;/gi, "'")
  .replace(/&copy;/gi, '©')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/[‐-―]/g, '-')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(decodeHtmlEntities(value))

const stripTags = (value) => normalizeText(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => normalizeText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toResolvedUrl = (value, base) => {
  try {
    return new URL(value, base).toString()
  } catch {
    return null
  }
}

const normalizeLocation = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) {
    return { location: null, city: null }
  }

  const city = normalizeCity(normalized)
  if (!city) {
    return { location: null, city: null }
  }

  return {
    city,
    location: /,\s*India$/i.test(city) ? city : `${city}, India`,
  }
}

const toCleanList = (items) =>
  Array.isArray(items)
    ? items.map((item) => normalizeText(item)).filter(Boolean)
    : []

const buildJobDescription = ({ responsibilities, requirements }) => {
  const lines = []

  if (responsibilities.length > 0) {
    lines.push('What would you be doing here?')
    lines.push(...responsibilities.map((item) => `- ${item}`))
  }

  if (requirements.length > 0) {
    lines.push('The best-fit candidate would have:')
    lines.push(...requirements.map((item) => `- ${item}`))
  }

  return lines.length > 0 ? lines.join('\n') : null
}

const extractListingSlug = (listing) => {
  const raw = normalizeText(listing?.url)
  if (!raw) return null

  try {
    const resolved = new URL(raw, HOMEPAGE_URL)
    const segments = resolved.pathname.split('/').filter(Boolean)
    return normalizeText(segments.at(-1))
  } catch {
    const segments = raw.split('/').filter(Boolean)
    return normalizeText(segments.at(-1))
  }
}

const normalizeListingRecord = (listing, { allowGenericDoctorLanding = false } = {}) => {
  if (!listing || typeof listing !== 'object') {
    throw new Error('Daily Rounds listing payload no longer matches the verified first-party API shape')
  }

  const title = normalizeText(listing.roleNames)
  const team = normalizeText(listing.team)
  const slug = extractListingSlug(listing)

  if (!title || !slug) {
    throw new Error('Daily Rounds listing payload no longer matches the verified first-party API shape')
  }

  const isGenericDoctorLanding = listing.type === 'doctors' || slug.toLowerCase() === 'doctor'
  if (isGenericDoctorLanding && !allowGenericDoctorLanding) {
    return null
  }

  return {
    title,
    team,
    slug,
    isGenericDoctorLanding,
  }
}

const hasValidListingPayload = (payload, { allowGenericDoctorLanding = false } = {}) => {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.job_openings)) {
    return false
  }

  try {
    payload.job_openings.forEach((listing) => {
      const normalized = normalizeListingRecord(listing, { allowGenericDoctorLanding })
      if (normalized === null && !allowGenericDoctorLanding) {
        throw new Error('Unexpected generic doctor landing entry')
      }
    })
    return true
  } catch {
    return false
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*DailyRounds\s*<\/title>/i.test(page)
    && /\bDailyRounds\b/i.test(text)
    && /\bMarrow\b/i.test(text)
    && /\bDBMCI One\b/i.test(text)
    && /Neuroglia Health/i.test(text)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Careers\s*-\s*DailyRounds\s*<\/title>/i.test(page)
    && /Explore a career with Marrow,\s*DailyRounds or DBMCI One/i.test(text)
    && /\bOpen Positions\b/i.test(text)
    && /\bMarrow\b/i.test(text)
    && /\bDailyRounds\b/i.test(text)
    && /\bDBMCI One\b/i.test(text)
    && /Neuroglia Health Pvt Limited/i.test(text)
    && /fetch\("\/api\/careers"\)/i.test(page)
}

export const hasOfficialDoctorCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Doctor Careers\s*-\s*DailyRounds\s*<\/title>/i.test(page)
    && /An academic career option for Doctors at Marrow,\s*DailyRounds\s*&\s*DBMCI One/i.test(text)
    && /\bOpen positions\b/i.test(text)
    && /Neuroglia Health Pvt Limited/i.test(text)
    && /fetch\("\/api\/careers\/doctor"\)/i.test(page)
}

export const hasValidCareersListingPayload = (payload) =>
  hasValidListingPayload(payload, { allowGenericDoctorLanding: true })

export const hasValidDoctorListingPayload = (payload) =>
  hasValidListingPayload(payload)

const normalizeDetailPayload = (payload, { fallbackTitle, fallbackTeam } = {}) => {
  const details = payload?.job_details
  if (!details || details.exists !== true) {
    throw new Error(DETAIL_PAYLOAD_ERROR_MESSAGE)
  }

  const title = normalizeText(details.role || details.roles || fallbackTitle)
  const department = normalizeText(details.team || fallbackTeam)
  const responsibilities = toCleanList(details.do)
  const requirements = toCleanList(details.have)
  const applyUrl = toResolvedUrl(details.applyNowLink ?? null, CAREERS_URL)
  const { location, city } = normalizeLocation(details.location)

  if (!title) {
    throw new Error(DETAIL_PAYLOAD_ERROR_MESSAGE)
  }

  return {
    title,
    department,
    location,
    city,
    applyUrl,
    responsibilities,
    requirements,
  }
}

const isDetailPayloadShapeError = (error) =>
  error instanceof Error && error.message === DETAIL_PAYLOAD_ERROR_MESSAGE

export const buildProfileApiUrl = ({ slug, context }) =>
  `${context === 'doctor' ? DOCTOR_PROFILE_API_BASE_URL : CAREERS_PROFILE_API_BASE_URL}/${encodeURIComponent(slug)}`

export const buildProfilePageUrl = ({ slug, context }) =>
  `${context === 'doctor' ? DOCTOR_PROFILE_PAGE_BASE_URL : CAREERS_PROFILE_PAGE_BASE_URL}/${encodeURIComponent(slug)}`

export const buildApiRequestHeaders = (referer) => ({
  'User-Agent': USER_AGENT,
  Accept: 'application/json,text/plain,*/*',
  Origin: HOMEPAGE_URL.replace(/\/$/, ''),
  Referer: referer,
})

const buildNormalizedJob = ({ listing, detailPayload, context }) => {
  const detail = normalizeDetailPayload(detailPayload, {
    fallbackTitle: listing.title,
    fallbackTeam: listing.team,
  })

  return {
    title: detail.title,
    department: detail.department,
    location: detail.location,
    city: detail.city,
    country: 'India',
    jobId: `${SOURCE}-${slugify(listing.slug)}`,
    requisitionId: `${SOURCE}-${slugify(listing.slug)}`,
    sourceUrl: buildProfilePageUrl({ slug: listing.slug, context }),
    applyUrl: detail.applyUrl,
    employmentType: null,
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: detail.requirements,
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: buildJobDescription({
      responsibilities: detail.responsibilities,
      requirements: detail.requirements,
    }),
    companyCareerPage: context === 'doctor' ? DOCTOR_CAREERS_URL : CAREERS_URL,
  }
}

const buildNormalizedJobOrNull = ({ listing, detailPayload, context }) => {
  try {
    return buildNormalizedJob({ listing, detailPayload, context })
  } catch (error) {
    if (isDetailPayloadShapeError(error)) {
      return null
    }

    throw error
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

const defaultFetchJson = (url, { referer }) => fetchJsonWithRetry(url, {
  headers: buildApiRequestHeaders(referer),
  label: SOURCE,
  timeoutMs: 15000,
})

export const createDailyRoundsScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now: overrideNow,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Daily Rounds verified official homepage no longer matches the trusted first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Daily Rounds verified careers page no longer matches the trusted first-party surface')
    }

    const doctorCareersHtml = await fetchText(DOCTOR_CAREERS_URL)
    if (!hasOfficialDoctorCareersSignal(doctorCareersHtml)) {
      throw new Error('Daily Rounds verified doctor careers page no longer matches the trusted first-party surface')
    }

    const careersPayload = await fetchJson(CAREERS_API_URL, { referer: CAREERS_URL })
    if (!hasValidCareersListingPayload(careersPayload)) {
      throw new Error('Daily Rounds careers listing API no longer matches the verified first-party shape')
    }

    const doctorPayload = await fetchJson(DOCTOR_CAREERS_API_URL, { referer: DOCTOR_CAREERS_URL })
    if (!hasValidDoctorListingPayload(doctorPayload)) {
      throw new Error('Daily Rounds doctor listing API no longer matches the verified first-party shape')
    }

    const generalListings = careersPayload.job_openings
      .map((listing) => normalizeListingRecord(listing, { allowGenericDoctorLanding: true }))
      .filter((listing) => listing && !listing.isGenericDoctorLanding)

    const doctorListings = doctorPayload.job_openings
      .map((listing) => normalizeListingRecord(listing))
      .filter(Boolean)

    const generalJobs = (await Promise.all(
      generalListings.map(async (listing) => buildNormalizedJobOrNull({
        listing,
        context: 'general',
        detailPayload: await fetchJson(buildProfileApiUrl({ slug: listing.slug, context: 'general' }), {
          referer: CAREERS_URL,
        }),
      })),
    )).filter(Boolean)

    const doctorJobs = (await Promise.all(
      doctorListings.map(async (listing) => buildNormalizedJobOrNull({
        listing,
        context: 'doctor',
        detailPayload: await fetchJson(buildProfileApiUrl({ slug: listing.slug, context: 'doctor' }), {
          referer: DOCTOR_CAREERS_URL,
        }),
      })),
    )).filter(Boolean)

    const verifiedJobs = [...generalJobs, ...doctorJobs]

    if (verifiedJobs.length === 0 && (generalListings.length > 0 || doctorListings.length > 0)) {
      throw new Error(NO_VERIFIED_JOB_DETAILS_ERROR_MESSAGE)
    }

    return verifiedJobs
      .sort((left, right) => left.title.localeCompare(right.title) || left.jobId.localeCompare(right.jobId))
      .map((job) => ({
        ...job,
        company: COMPANY,
        source: SOURCE,
        companyDomain: COMPANY_DOMAIN,
        atsPlatform: 'official-company-careers',
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: (overrideNow || now)(),
      }))
  },
})

export const run = async (options = {}) => createDailyRoundsScraper().run(options)

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
