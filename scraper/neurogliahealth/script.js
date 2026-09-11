import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'neurogliahealth'
export const COMPANY = 'Neuroglia Health Pvt Ltd'
export const COMPANY_DOMAIN = 'neurogliahealth.com'
export const HOMEPAGE_URL = 'https://neurogliahealth.com/'
export const CAREERS_URL = 'https://dailyrounds.org/careers'
export const DOCTOR_CAREERS_URL = 'https://dailyrounds.org/careers/doctor'
export const CAREERS_API_URL = 'https://dailyrounds.org/api/careers'
export const DOCTOR_CAREERS_API_URL = 'https://dailyrounds.org/api/careers/doctor'
export const CAREERS_PROFILE_API_BASE_URL = 'https://dailyrounds.org/api/careers/profile'
export const DOCTOR_PROFILE_API_BASE_URL = 'https://dailyrounds.org/api/careers/doctor_profile'
export const CAREERS_PROFILE_PAGE_BASE_URL = 'https://dailyrounds.org/careers/profile'
export const DOCTOR_PROFILE_PAGE_BASE_URL = 'https://dailyrounds.org/careers/doctor_profile'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

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
  const raw = normalizeText(listing?.url).replace(/^<base_url>\/?/i, '')
  if (!raw) return null

  try {
    const resolved = new URL(raw, 'https://dailyrounds.org')
    const segments = resolved.pathname.split('/').filter(Boolean)
    return normalizeText(segments.at(-1))
  } catch {
    const segments = raw.split('/').filter(Boolean)
    return normalizeText(segments.at(-1))
  }
}

const normalizeListingRecord = (listing, { allowGenericDoctorLanding = false } = {}) => {
  if (!listing || typeof listing !== 'object') {
    throw new Error('Neuroglia Health listing payload no longer matches the verified first-party API shape')
  }

  const title = normalizeText(listing.roleNames)
  const team = normalizeText(listing.team)
  const slug = extractListingSlug(listing)

  if (!title || !slug) {
    throw new Error('Neuroglia Health listing payload no longer matches the verified first-party API shape')
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

  return /<title>\s*Neuroglia Health Private Limited\s*<\/title>/i.test(page)
    && /Neuroglia Health Pvt Ltd includes Marrow App/i.test(page)
    && /Marrow is an online learning platform/i.test(text)
    && /www\.marrow\.com/i.test(text)
    && /support@marrowmed\.com/i.test(text)
    && /JP Nagar 4th Phase/i.test(text)
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
    throw new Error('Neuroglia Health detail payload no longer matches the verified first-party API shape')
  }

  const title = normalizeText(details.role || details.roles || fallbackTitle)
  const department = normalizeText(details.team || fallbackTeam)
  const responsibilities = toCleanList(details.do)
  const requirements = toCleanList(details.have)
  const applyUrl = toResolvedUrl(details.applyNowLink ?? null, CAREERS_URL)
  const { location, city } = normalizeLocation(details.location)

  if (!title) {
    throw new Error('Neuroglia Health detail payload no longer matches the verified first-party API shape')
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

const isVerifiedAbsentDetailPayload = (payload) => payload?.job_details?.exists === false

const buildProfileApiUrl = ({ slug, context }) =>
  `${context === 'doctor' ? DOCTOR_PROFILE_API_BASE_URL : CAREERS_PROFILE_API_BASE_URL}/${encodeURIComponent(slug)}`

const buildProfilePageUrl = ({ slug, context }) =>
  `${context === 'doctor' ? DOCTOR_PROFILE_PAGE_BASE_URL : CAREERS_PROFILE_PAGE_BASE_URL}/${encodeURIComponent(slug)}`

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
    publicExperienceChecked: true,
    companyCareerPage: context === 'doctor' ? DOCTOR_CAREERS_URL : CAREERS_URL,
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

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: CAREERS_URL,
    Origin: 'https://dailyrounds.org',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createNeurogliaHealthScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now: overrideNow,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Neuroglia Health verified official homepage no longer matches the trusted first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Neuroglia Health verified careers page no longer matches the trusted first-party surface')
    }

    const doctorCareersHtml = await fetchText(DOCTOR_CAREERS_URL)
    if (!hasOfficialDoctorCareersSignal(doctorCareersHtml)) {
      throw new Error('Neuroglia Health verified doctor careers page no longer matches the trusted first-party surface')
    }

    const careersPayload = await fetchJson(CAREERS_API_URL)
    if (!hasValidCareersListingPayload(careersPayload)) {
      throw new Error('Neuroglia Health careers listing API no longer matches the verified first-party shape')
    }

    const doctorPayload = await fetchJson(DOCTOR_CAREERS_API_URL)
    if (!hasValidDoctorListingPayload(doctorPayload)) {
      throw new Error('Neuroglia Health doctor listing API no longer matches the verified first-party shape')
    }

    const generalListings = careersPayload.job_openings
      .map((listing) => normalizeListingRecord(listing, { allowGenericDoctorLanding: true }))
      .filter((listing) => listing && !listing.isGenericDoctorLanding)

    const doctorListings = doctorPayload.job_openings
      .map((listing) => normalizeListingRecord(listing))
      .filter(Boolean)

    const generalJobs = await Promise.all(
      generalListings.map(async (listing) => {
        const detailPayload = await fetchJson(buildProfileApiUrl({ slug: listing.slug, context: 'general' }))
        if (isVerifiedAbsentDetailPayload(detailPayload)) {
          throw new Error(`Neuroglia Health detail payload is absent for verified listing ${listing.slug}`)
        }

        return buildNormalizedJob({ listing, context: 'general', detailPayload })
      }),
    )

    const doctorJobs = await Promise.all(
      doctorListings.map(async (listing) => buildNormalizedJob({
        listing,
        context: 'doctor',
        detailPayload: await fetchJson(buildProfileApiUrl({ slug: listing.slug, context: 'doctor' })),
      })),
    )

    return [...generalJobs, ...doctorJobs]
      .filter(Boolean)
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

export const run = async (options = {}) => createNeurogliaHealthScraper().run(options)

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
