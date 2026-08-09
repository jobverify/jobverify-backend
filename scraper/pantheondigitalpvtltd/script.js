import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'pantheondigitalpvtltd'
export const COMPANY = 'Pantheon Digital Pvt Ltd'
export const HOMEPAGE_URL = 'https://pantheondigitals.com/'
export const ABOUT_URL = 'https://pantheondigitals.com/About'
export const CONTACT_URL = 'https://pantheondigitals.com/Contact_Us'
export const CAREERS_URL = 'https://pantheondigitals.com/careers'
export const JOBS_URL = 'https://pantheondigitals.com/jobs'
export const CUTSHORT_COMPANY_URL = 'https://cutshort.io/company/pantheon-digital-96-46NMdJSa'
export const LINKEDIN_COMPANY_URL = 'https://linkedin.com/company/pantheon-digitals'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_LOCATION_PATTERN =
  /\b(india|delhi|gurgaon|gurugram|noida|mumbai|pune|hyderabad|chennai|bengaluru|bangalore|kolkata)\b/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;/gi, "'")
  .replace(/&quot;|&#34;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/section|\/h[1-6]|\/ul)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeUrl = (value) => normalizeWhitespace(value).replace(/\/+$/, '').toLowerCase()

const toArray = (value) => Array.isArray(value) ? value : []

const normalizeEmploymentType = (roleTypes) => {
  const normalized = toArray(roleTypes).map((value) => normalizeWhitespace(value).toLowerCase())

  if (normalized.includes('full_time')) return 'Full-time'
  if (normalized.includes('internship')) return 'Internship'
  if (normalized.includes('part_time')) return 'Part-time'

  return null
}

const normalizeExperienceRequired = (expRange = {}) => {
  const min = Number(expRange.minVanity ?? expRange.min)
  const max = Number(expRange.maxVanity ?? expRange.max)

  if (Number.isFinite(min) && Number.isFinite(max) && max >= min) {
    return `${min} - ${max} years`
  }

  if (Number.isFinite(min)) {
    return `${min}+ years`
  }

  return null
}

const buildIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/\bindia\b/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const extractCity = (location) => normalizeWhitespace(location).split(',')[0] || null

const parseNextData = (html) => {
  const match = String(html ?? '').match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  )
  if (!match) return null

  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = normalizeWhitespace(html).toLowerCase()

  return page.includes('pantheon digital')
    && page.includes('projects')
    && page.includes('about us')
    && page.includes('contact us')
}

export const hasOfficialAboutSignal = (html) => {
  const page = normalizeWhitespace(html).toLowerCase()

  return page.includes('about pantheon digital')
    && page.includes('creative digital experts')
    && page.includes('meet pantheon digitals')
    && page.includes('welcome to pantheon digital, where innovation meets excellence')
    && page.includes('contact us')
}

export const hasOfficialContactSignal = (html) => {
  const page = normalizeWhitespace(html).toLowerCase()

  return page.includes('pantheon digital')
    && page.includes('contact us')
    && page.includes('empowering your business with end-to-end digital solutions')
}

export const hasOfficialCutshortSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('pantheon digital careers')
    && normalized.includes('jobs at pantheon digital')
    && page.includes('https://pantheondigitals.com')
    && page.includes(LINKEDIN_COMPANY_URL)
    && /__NEXT_DATA__/i.test(page)
}

export const extractCompanyPageData = (html) => {
  const nextData = parseNextData(html)
  const queries = toArray(nextData?.props?.pageProps?.dehydratedState?.queries)
  const target = queries.find((entry) => {
    const queryKey = toArray(entry?.queryKey)
    return queryKey[0] === 'companyPageData' && queryKey[1] === 'pantheon-digital-96-46NMdJSa'
  })

  const payload = target?.state?.data ?? null

  if (payload?.data?.pageData) {
    return payload.data.pageData
  }

  if (payload?.pageData) {
    return payload.pageData
  }

  if (payload?.data && (payload.data.companyDetails || payload.data.companyJobs)) {
    return payload.data
  }

  return payload
}

const hasVerifiedMissingRouteError = (error, url) =>
  /HTTP 404\b/i.test(String(error?.message ?? error))
  && String(error?.message ?? error).includes(url)

const assertMissingRoute = async (fetchText, url) => {
  try {
    const html = await fetchText(url)
    if (/404: This page could not be found\./i.test(String(html ?? ''))) {
      return
    }
  } catch (error) {
    if (hasVerifiedMissingRouteError(error, url)) {
      return
    }

    throw error
  }

  throw new Error('Pantheon Digital first-party jobs surface changed and needs review before continuing')
}

const normalizeJob = (job, scrapedAt) => {
  const title = normalizeWhitespace(job?.headline)
  const jobId = normalizeWhitespace(job?._id)
  const sourceUrl = normalizeWhitespace(job?.publicUrl)
  const applyUrl = normalizeWhitespace(job?.authApplyUrl) || sourceUrl
  const location = buildIndiaLocation(job?.locationsText || toArray(job?.locations)[0])

  if (!title || !jobId || !sourceUrl || !location || !INDIA_LOCATION_PATTERN.test(location)) {
    return null
  }

  return {
    title,
    company: COMPANY,
    location,
    city: extractCity(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl,
    employmentType: normalizeEmploymentType(job?.roleTypes),
    department: null,
    experienceRequired: normalizeExperienceRequired(job?.expRange),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: toArray(job?.allSkills).map((value) => normalizeWhitespace(value)).filter(Boolean),
    postingDate: normalizeWhitespace(job?.hiringIntentShownOn) || null,
    closingDate: null,
    jobDescription: stripHtml(job?.sanitizedComment),
    source: SOURCE,
    link: sourceUrl,
    scrapedAt,
  }
}

const validateOfficialCutshortContext = (data) => {
  const companyDetails = data?.companyDetails
    || data?.company
    || data?.companyJobs?.jobs?.[0]?.companyDetails
  const website = normalizeUrl(companyDetails?.links?.website)
  const linkedin = normalizeUrl(companyDetails?.links?.linkedin)
  const alias = normalizeWhitespace(companyDetails?.alias)

  return normalizeWhitespace(companyDetails?.name).toLowerCase() === 'pantheon digital'
    && alias === 'pantheon-digital-96-46NMdJSa'
    && website === normalizeUrl(HOMEPAGE_URL)
    && linkedin === normalizeUrl(LINKEDIN_COMPANY_URL)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createPantheonDigitalScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Pantheon Digital verified homepage no longer matches the trusted first-party surface')
    }

    const aboutHtml = await fetchText(ABOUT_URL)
    if (!hasOfficialAboutSignal(aboutHtml)) {
      throw new Error('Pantheon Digital verified about page no longer matches the trusted first-party surface')
    }

    const contactHtml = await fetchText(CONTACT_URL)
    if (!hasOfficialContactSignal(contactHtml)) {
      throw new Error('Pantheon Digital verified contact page no longer matches the trusted first-party surface')
    }

    await assertMissingRoute(fetchText, CAREERS_URL)
    await assertMissingRoute(fetchText, JOBS_URL)

    const cutshortHtml = await fetchText(CUTSHORT_COMPANY_URL)
    if (!hasOfficialCutshortSignal(cutshortHtml)) {
      throw new Error('Pantheon Digital official Cutshort surface no longer matches the verified hiring handoff')
    }

    const companyPageData = extractCompanyPageData(cutshortHtml)
    if (!validateOfficialCutshortContext(companyPageData)) {
      throw new Error('Pantheon Digital official Cutshort surface no longer exposes the verified company identity')
    }

    const jobs = toArray(companyPageData?.companyJobs?.jobs)
      .map((job) => normalizeJob(job, now()))
      .filter(Boolean)

    if (!Array.isArray(companyPageData?.companyJobs?.jobs) || jobs.length === 0) {
      throw new Error('Pantheon Digital official Cutshort jobs payload changed or no longer exposes public openings')
    }

    return jobs
  },
})

export const run = async (options = {}) => createPantheonDigitalScraper().run(options)

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
