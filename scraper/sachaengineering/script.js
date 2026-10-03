import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'sachaengineering'
export const COMPANY = 'SACHA Engineering'
export const COMPANY_DOMAIN = 'sacha.group'
export const HOMEPAGE_URL = 'https://sacha.group/'
export const CAREERS_URL = 'https://sacha.group/careers/'
export const BELL_COMPANY_URL = 'https://bell.careers/company/sacha'
export const BELL_JOBS_URL = 'https://bell.careers/company/sacha?tab=jobs'
export const BELL_COMPANY_API_URL = 'https://api.bell.careers/api/company/companies/sacha/'

const ATS_PLATFORM = 'bell-careers-via-first-party-company-handoff'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&#039;|&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&quot;/gi, '"')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value)
    .replace(/\u00a0|\u202f/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|\/section)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
) || ''

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'full_time' || normalized === 'full-time' || normalized === 'full time') {
    return 'Full-time'
  }
  if (normalized === 'part_time' || normalized === 'part-time' || normalized === 'part time') {
    return 'Part-time'
  }
  return normalized
    .split(/[\s_-]+/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join('-')
}

const normalizeExperience = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/years?/i.test(normalized)) return normalized
  if (/^\d+\s*-\s*\d+$/.test(normalized)) return `${normalized} Years`
  return normalized
}

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

const splitSkills = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return []

  return [...new Set(
    normalized
      .split(',')
      .map((part) => normalizeWhitespace(part))
      .filter(Boolean),
  )]
}

const inferRemoteStatus = (description) => {
  const normalized = normalizeWhitespace(description)?.toLowerCase()
  if (!normalized) return null
  if (/\bhybrid\b/.test(normalized)) return 'Hybrid'
  if (/\bremote\b/.test(normalized)) return 'Remote'
  return null
}

const parseBellLocation = (value, currency) => {
  const normalized = normalizeWhitespace(value)
  const inferredCountry = normalizeWhitespace(currency)?.toUpperCase() === 'INR' ? 'India' : null

  if (!normalized || /^none$/i.test(normalized)) {
    return {
      location: null,
      city: null,
      country: inferredCountry,
    }
  }

  const city = normalizeWhitespace(normalized.split(/[|,/]/)[0])

  if (/,\s*india$/i.test(normalized)) {
    return {
      location: normalized,
      city: normalizeWhitespace(normalized.replace(/,\s*india$/i, '')),
      country: 'India',
    }
  }

  if (inferredCountry) {
    return {
      location: `${normalized}, India`,
      city,
      country: 'India',
    }
  }

  return {
    location: normalized,
    city,
    country: null,
  }
}

const decodeFlightChunk = (value) => {
  const literal = `"${String(value ?? '')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}"`

  try {
    return JSON.parse(literal)
  } catch {
    return null
  }
}

const extractFlightChunks = (html) =>
  [...String(html ?? '').matchAll(/self\.__next_f\.push\(\[1,"((?:\\.|[^"])*)"\]\)/g)]
    .map((match) => decodeFlightChunk(match[1]))
    .filter(Boolean)

const extractBellPayload = (chunks) => {
  const payloadChunk = chunks.find((chunk) =>
    chunk.startsWith('{')
    && chunk.includes('"name":"SACHA Engineering"')
    && chunk.includes(`"url":"${BELL_COMPANY_URL}"`)
    && chunk.includes('"job_posts":['),
  )

  if (!payloadChunk) {
    throw new Error('SACHA Engineering verified Bell company jobs payload is missing from the public page')
  }

  let payload
  try {
    payload = JSON.parse(payloadChunk)
  } catch {
    throw new Error('SACHA Engineering verified Bell company jobs payload is no longer valid JSON')
  }

  if (payload?.name !== COMPANY || !Array.isArray(payload?.job_posts)) {
    throw new Error('SACHA Engineering verified Bell company jobs payload no longer matches the expected company identity')
  }

  return payload
}

const extractDescriptionMap = (chunks, jobs) => {
  const wantedTokens = new Set(
    jobs
      .map((job) => normalizeWhitespace(job?.description)?.replace(/^\$/, '').toLowerCase())
      .filter(Boolean),
  )

  const descriptions = new Map()
  let pendingToken = null

  for (const chunk of chunks) {
    const tokenMatch = chunk.match(/^([0-9a-f]+):T[0-9a-f]+,$/i)
    if (tokenMatch) {
      const token = tokenMatch[1].toLowerCase()
      pendingToken = wantedTokens.has(token) ? token : null
      continue
    }

    if (pendingToken) {
      const text = normalizeWhitespace(chunk)
      if (text) {
        descriptions.set(pendingToken, text)
      }
      pendingToken = null
    }
  }

  return descriptions
}

const normalizeBellJobDescription = (description, descriptions = null) => {
  const descriptionKey = normalizeWhitespace(description)?.replace(/^\$/, '').toLowerCase()
  if (descriptionKey && descriptions?.has(descriptionKey)) {
    return descriptions.get(descriptionKey) || null
  }

  return normalizeWhitespace(description)
}

const normalizeBellJobPosts = (jobPosts, { descriptions = null } = {}) => {
  const normalizedJobs = jobPosts.map((job) => {
    const title = normalizeWhitespace(job?.job_post_title)
    const postId = normalizeWhitespace(job?.post_id)
    const location = parseBellLocation(job?.location, job?.currency)
    const jobDescription = normalizeBellJobDescription(job?.description, descriptions)

    if (!title || !postId) {
      return null
    }

    return {
      jobId: `${SOURCE}-${postId}`,
      requisitionId: String(postId),
      title,
      company: COMPANY,
      department: null,
      location: location.location,
      city: location.city,
      country: location.country,
      sourceUrl: BELL_JOBS_URL,
      applyUrl: BELL_JOBS_URL,
      employmentType: normalizeEmploymentType(job?.job_type),
      experienceRequired: normalizeExperience(job?.experience_level),
      minimumQualification: normalizeWhitespace(job?.qualifications),
      preferredQualification: null,
      requiredSkills: splitSkills(job?.skills),
      postingDate: normalizeDate(job?.published_date || job?.date),
      closingDate: null,
      jobDescription,
      remoteStatus: inferRemoteStatus(jobDescription),
    }
  }).filter(Boolean)

  if (jobPosts.length > 0 && normalizedJobs.length === 0) {
    throw new Error('SACHA Engineering verified Bell company jobs payload no longer produces normalized openings')
  }

  return normalizedJobs
}

const parseBellCompanyApiPage = (payloadValue) => {
  let payload = payloadValue
  if (typeof payloadValue === 'string') {
    try {
      payload = JSON.parse(payloadValue)
    } catch {
      throw new Error('SACHA Engineering Bell company API payload is no longer valid JSON')
    }
  }

  if (payload?.results?.name !== COMPANY || !Array.isArray(payload?.results?.job_posts)) {
    throw new Error('SACHA Engineering Bell company API payload no longer matches the expected company identity')
  }

  return payload
}

const fetchBellCompanyApiJobPosts = async (fetchBellCompanyApiPage, initialUrl = BELL_COMPANY_API_URL) => {
  const allJobPosts = []
  const seenPostIds = new Set()
  let nextUrl = initialUrl

  while (nextUrl) {
    const payloadValue = await fetchBellCompanyApiPage(nextUrl)
    const payload = parseBellCompanyApiPage(payloadValue)

    for (const jobPost of payload.results.job_posts) {
      const postId = normalizeWhitespace(jobPost?.post_id)
      if (!postId || seenPostIds.has(postId)) {
        continue
      }

      seenPostIds.add(postId)
      allJobPosts.push(jobPost)
    }

    nextUrl = payload.next ? new URL(payload.next, BELL_COMPANY_API_URL).toString() : null
  }

  return allJobPosts
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return (
    /<title>\s*SACHA Group \| Innovative Engineering &amp; Digital Solutions\s*<\/title>/i.test(page)
    && /<link rel="canonical" href="https:\/\/sacha\.group\/"\s*\/?>/i.test(page)
    && /Discover SACHA Group'?s expertise in delivering advanced engineering, IT, and digital innovation services/i.test(text)
    && (
      /href=["']\/careers\/["']/i.test(page)
      || /href=["']https:\/\/sacha\.group\/careers\/["']/i.test(page)
      || /href=["']https:\/\/bell\.careers\/company\/sacha\?tab=jobs["']/i.test(page)
    )
  )
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return (
    /<title>\s*Careers - SACHA\s*<\/title>/i.test(page)
    && /<link rel="canonical" href="https:\/\/sacha\.group\/careers\/"\s*\/?>/i.test(page)
    && /Career Search/i.test(text)
    && /Current openings/i.test(text)
    && /bell\.careers\/company\/sacha\?tab=jobs/i.test(page)
    && /bell\.careers\/upload-cv/i.test(page)
  )
}

export const hasVerifiedBellJobsSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return (
    /<title>\s*SACHA Engineering - (?:Bell Careers|bell\.careers)\s*<\/title>/i.test(page)
    && /<link rel="canonical" href="https:\/\/bell\.careers\/company\/sacha"\s*\/?>/i.test(page)
    && /SACHA Engineering/i.test(text)
    && /job_posts/i.test(page)
  )
}

export const extractBellJobPosts = (html) => {
  if (!hasVerifiedBellJobsSignal(html)) {
    throw new Error('SACHA Engineering verified Bell company jobs payload no longer matches the known public surface')
  }

  const chunks = extractFlightChunks(html)
  const payload = extractBellPayload(chunks)
  const descriptions = extractDescriptionMap(chunks, payload.job_posts)
  return normalizeBellJobPosts(payload.job_posts, { descriptions })
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchBellCompanyApiPage = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-bell-api`,
  timeoutMs: 15000,
})

export const createSachaEngineeringScraper = ({
  fetchText = defaultFetchText,
  fetchBellCompanyApiPage = defaultFetchBellCompanyApiPage,
  now = () => new Date().toISOString(),
} = {}) => ({
  run: async ({ fetchText: overrideFetchText, fetchBellCompanyApiPage: overrideFetchBellCompanyApiPage, now: overrideNow } = {}) => {
    const fetchImpl = overrideFetchText || fetchText
    const fetchBellApiPageImpl = overrideFetchBellCompanyApiPage || overrideFetchText || fetchBellCompanyApiPage

    const homepageHtml = await fetchImpl(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('SACHA Engineering verified official homepage no longer matches the known first-party surface')
    }

    const careersHtml = await fetchImpl(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('SACHA Engineering verified official careers handoff no longer matches the known first-party Bell surface')
    }

    const bellJobsHtml = await fetchImpl(BELL_JOBS_URL)
    const scrapedAt = (overrideNow || now)()

    if (!hasVerifiedBellJobsSignal(bellJobsHtml)) {
      throw new Error('SACHA Engineering verified Bell company jobs payload no longer matches the known public surface')
    }

    const bellApiJobPosts = await fetchBellCompanyApiJobPosts(fetchBellApiPageImpl)

    return normalizeBellJobPosts(bellApiJobPosts)
      .filter((job) => job.country === 'India')
      .map((job) => ({
      ...job,
      source: SOURCE,
      companyCareerPage: CAREERS_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: ATS_PLATFORM,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
      }))
  },
})

export const run = async (options = {}) => createSachaEngineeringScraper().run(options)

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
