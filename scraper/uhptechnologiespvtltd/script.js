import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const UHP_CAREERS_URL = 'https://uhptech.com/careers/'
export const KAS_CAREERS_URL = 'https://kasgroup.in/careers/'
export const COMPANY_DETAILS_URL = 'https://uhptechnologies.greythr.com/hire/api/career/get_company_details/'
export const JOBS_API_URL = 'https://uhptechnologies.greythr.com/hire/api/career/published_jobs/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;/gi, "'")
    .replace(/&#8211;|&#8212;/gi, '-')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) =>
  normalizeWhitespace(
    String(value ?? '')
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const stripTagsPreservingLines = (value) =>
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;/gi, "'")
    .replace(/&#8211;|&#8212;/gi, '-')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))

const toLines = (value) =>
  stripTagsPreservingLines(value)
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

export const hasUhpCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Careers\b[^<]*Uhp Tech/i.test(page)
    && /UHP Technologies Pvt\.?\s*Ltd/i.test(page)
    && /Explore Careers at UHP Tech/i.test(page)
    && /https:\/\/www\.kasgroup\.in\/careers\//i.test(page)
}

export const hasKasGroupHandoffSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Careers\b[^<]*KAS Group/i.test(page)
    && /KAS Group is a dynamic conglomerate of UHP Technologies Pvt Ltd/i.test(page)
    && /https:\/\/uhptechnologies\.greythr\.com\/hire\/jobs\//i.test(page)
}

const hasCompanyDetailsSignal = (payload) => {
  const companyName = normalizeWhitespace(payload?.company_name)
  const website = normalizeWhitespace(payload?.other_details?.website)
  const linkedIn = normalizeWhitespace(payload?.other_details?.social?.in)

  return companyName === 'M/S UHP TECHNOLOGIES Pvt Ltd'
    && /kasgroup\.in/i.test(website || '')
    && /linkedin\.com\/company\/uhp-technologies/i.test(linkedIn || '')
}

const monthsToYearsLabel = (months) => {
  if (!Number.isFinite(months) || months <= 0) return null

  const years = months / 12
  const rounded = Number.isInteger(years) ? years.toString() : years.toFixed(1).replace(/\.0$/, '')
  return `${rounded} years`
}

const extractExperienceRequired = (job) => {
  const min = Number(job?.min_exp)
  const max = Number(job?.max_exp)

  if ((!Number.isFinite(min) || min <= 0) && (!Number.isFinite(max) || max <= 0)) {
    return null
  }

  const minLabel = monthsToYearsLabel(min)
  const maxLabel = monthsToYearsLabel(max)

  if (minLabel && maxLabel) {
    return `${minLabel.replace(' years', '')}-${maxLabel}`
  }

  return minLabel || maxLabel
}

const extractQualification = (description) => {
  const lines = toLines(description)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (/^(qualification|educational qualification)\b/i.test(line)) {
      const inlineValue = normalizeWhitespace(line.replace(/^(qualification|educational qualification)\s*:?\s*/i, ''))
      if (inlineValue) return inlineValue

      for (let nextIndex = index + 1; nextIndex < Math.min(lines.length, index + 4); nextIndex += 1) {
        const candidate = lines[nextIndex]
        if (!/^(job summary|requirements?|required skills|preferred skills|overview|experience)\b/i.test(candidate)) {
          return candidate
        }
      }
    }
  }

  return null
}

const extractLocation = (job) => {
  const text = stripTagsPreservingLines(job?.description)
  const patterns = [
    /Job Location\s*:?\s*([^\n]+)/i,
    /Work Location\s*:?\s*([^\n]+)/i,
    /Location\s*:?\s*([^\n]+)/i,
    /Ability to commute\/relocate\s*:?\s*([^\n.]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    const location = normalizeWhitespace(match?.[1])
    if (location) return location
  }

  if (/pan india|anywhere in india|across major industrial hubs/i.test(text)) {
    return 'PAN India'
  }

  return null
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || /pan india/i.test(normalized)) return null

  const cityMatch = normalized.match(/\b(Bangalore|Bengaluru|Chikhli|Gujarat)\b/i)
  if (cityMatch) {
    return cityMatch[1]
  }

  const segments = normalized.split(',').map((segment) => normalizeWhitespace(segment)).filter(Boolean)
  if (!segments.length) return null

  return segments[0]
}

const extractRemoteStatus = (job, location) => {
  const text = stripTags(job?.description) || ''

  if (
    /project sites?|customer location|anywhere in india|pan india|deployment in customer location|work location:\s*in person/i.test(text)
    || /pan india/i.test(location || '')
  ) {
    return 'On-site'
  }

  return job?.is_remote ? 'Remote' : 'On-site'
}

const mapJob = (job) => {
  const description = stripTags(job?.description)
  const location = extractLocation(job)

  return {
    title: normalizeWhitespace(job?.title),
    company: 'UHP Technologies Pvt Ltd',
    department: null,
    location,
    city: extractCity(location),
    country: 'India',
    jobId: normalizeWhitespace(job?.id),
    requisitionId: normalizeWhitespace(job?.req_id),
    sourceUrl: normalizeWhitespace(job?.apply_url),
    applyUrl: normalizeWhitespace(job?.apply_url),
    employmentType: normalizeWhitespace(job?.job_type),
    experienceRequired: extractExperienceRequired(job),
    minimumQualification: extractQualification(job?.description),
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(job?.published_on_career_page || job?.created_at),
    closingDate: null,
    jobDescription: description,
    remoteStatus: extractRemoteStatus(job, location),
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const defaultFetchJson = async (url, options = {}) => {
  const method = options.method || 'GET'
  const response = await fetch(url, {
    method,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json, text/plain, */*',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    body: method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createUhpTechnologiesScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const uhpCareersHtml = await fetchText(UHP_CAREERS_URL)
    if (!hasUhpCareersSignal(uhpCareersHtml)) {
      throw new Error('The official UHP Technologies careers surface changed; refusing to scrape unverified jobs')
    }

    const kasCareersHtml = await fetchText(KAS_CAREERS_URL)
    if (!hasKasGroupHandoffSignal(kasCareersHtml)) {
      throw new Error('The official KAS Group handoff surface changed; refusing to scrape unverified jobs')
    }

    const companyDetails = await fetchJson(COMPANY_DETAILS_URL, { method: 'GET' })
    if (!hasCompanyDetailsSignal(companyDetails)) {
      throw new Error('The official GreytHR company details no longer match UHP Technologies Pvt Ltd')
    }

    const payload = await fetchJson(JOBS_API_URL, {
      method: 'POST',
      body: {},
    })

    const rawJobs = Array.isArray(payload?.data) ? payload.data : []
    const mappedJobs = rawJobs
      .map(mapJob)
      .filter((job) => job.title && job.applyUrl)

    const selectedJobs = maxJobs ? mappedJobs.slice(0, maxJobs) : mappedJobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'uhptechnologiespvtltd',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createUhpTechnologiesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running UHP Technologies Pvt Ltd scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'uhptechnologiespvtltd')
    console.log('DB result:', result)
    process.exit(0)
  }
}
