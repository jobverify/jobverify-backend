import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'datadesign'
export const COMPANY = 'Data Design'
export const HOMEPAGE_URL = 'https://www.datadesign.co.jp/'
export const CAREERS_PAGE_URL = 'https://recruit.datadesign.co.jp/jobs'
export const JOBS_API_URL = 'https://recruit.datadesign.co.jp/wp-json/wp/v2/tj_job'

const COUNTRY = 'Japan'
const CAREERS_ORIGIN = new URL(CAREERS_PAGE_URL).origin
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtml(value)
    .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/section)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|ul|ol|h[1-6]|section)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    url.search = ''
    return url.toString()
  } catch {
    return null
  }
}

const isFirstPartyJobLink = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    return url.origin === CAREERS_ORIGIN && /^\/jobs(?:\/|$)/.test(url.pathname)
  } catch {
    return false
  }
}

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractLocationParts = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      state: null,
      country: COUNTRY,
    }
  }

  const parts = normalized
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  let state = null
  let city = null

  if (parts.length >= 2 && /[都道府県]$/.test(parts[0])) {
    [state, city] = parts
  } else if (parts.length >= 2) {
    [city, state] = parts
  } else {
    [city] = parts
  }

  return {
    location: [city, state, COUNTRY].filter(Boolean).join(', ') || `${normalized}, ${COUNTRY}`,
    city: city || null,
    state: state || null,
    country: COUNTRY,
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/intern|インターン/.test(normalized)) return 'Internship'
  if (/contract|契約/.test(normalized)) return 'Contract'
  if (/part.?time|パート|アルバイト/.test(normalized)) return 'Part-time'
  if (/full.?time|正社員/.test(normalized)) return 'Full-time'
  return normalizeWhitespace(value)
}

const normalizeRemoteStatus = (...values) => {
  const normalized = normalizeWhitespace(values.filter(Boolean).join(' '))?.toLowerCase() || ''
  if (/hybrid|ハイブリッド/.test(normalized)) return 'Hybrid'
  if (/remote|telework|在宅|リモート/.test(normalized)) return 'Remote'
  if (/on[- ]?site|onsite|出社|オンサイト/.test(normalized)) return 'On-site'
  return null
}

const appendHtmlSection = (parts, label, html) => {
  const text = stripTags(html)
  if (!text) return
  parts.push(`${label}: ${text}`)
}

const buildJobDescription = (values = {}, fallbackExcerpt = null) => {
  const parts = []
  appendHtmlSection(parts, '仕事内容', values.job_description)
  appendHtmlSection(parts, '具体的な業務内容', values.responsibilities)
  appendHtmlSection(parts, '福利厚生', values.job_benefits)
  appendHtmlSection(parts, '給与・賃金', values.cf_salary_description)
  appendHtmlSection(parts, '選考フロー', values.cf_selection_process)

  if (parts.length > 0) return parts.join('\n\n')
  return stripTags(fallbackExcerpt)
}

const extractRequiredSkills = (values = {}) => {
  const fromSkills = extractListItems(values.skills)
  if (fromSkills.length > 0) return fromSkills

  const fromQualifications = extractListItems(values.qualifications)
  if (fromQualifications.length > 0) return fromQualifications

  return []
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return page.includes('データ・デザイン｜3Dデータでワークフローを最適化')
    && page.includes('https://www.datadesign.co.jp/')
    && page.includes('最新3D技術でデータ課題を解決するデジタルプロセス・コーディネーター')
    && page.includes('datadesign')
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return page.includes('株式会社データ・デザイン採用サイト')
    && page.includes('post-type-archive-tj_job')
    && page.includes('wp-theme-data-design-recruit-theme')
    && page.includes('taro-jobs-job-field-style-inline-css')
}

export const buildListingsApiUrl = (page = 1, pageSize = 100) => {
  const url = new URL(JOBS_API_URL)
  url.searchParams.set(
    '_fields',
    'id,date,slug,status,type,link,title,excerpt,taro_jobs_fields_data',
  )
  url.searchParams.set('per_page', String(pageSize))
  url.searchParams.set('page', String(page))
  return url.toString()
}

const extractJobFromRecord = (record = {}) => {
  if (record?.type !== 'tj_job' || record?.status !== 'publish') {
    throw new Error('Response is not the verified first-party Data Design job listing')
  }

  if (!isFirstPartyJobLink(record?.link)) {
    throw new Error('Response is not the verified first-party Data Design job listing')
  }

  const values = record?.taro_jobs_fields_data?.values
  if (!values || normalizeUrl(values.organization_url) !== HOMEPAGE_URL) {
    throw new Error('Response is not the verified first-party Data Design job listing')
  }

  const title = normalizeWhitespace(values.job_title) || stripTags(record?.title?.rendered)
  const sourceUrl = normalizeUrl(record?.link)
  const jobId = normalizeWhitespace(record?.slug) || normalizeWhitespace(record?.id)
  const requisitionId = normalizeWhitespace(record?.id)
  const { location, city, state, country } = extractLocationParts(values.job_location)

  if (!title || !sourceUrl || !jobId || !requisitionId || !location) {
    throw new Error('Response is not the verified first-party Data Design job listing')
  }

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city,
    state,
    country,
    jobId,
    requisitionId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: normalizeEmploymentType(values.employment_type),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractRequiredSkills(values),
    postingDate: normalizeWhitespace(values.date_posted),
    closingDate: normalizeWhitespace(values.valid_through),
    jobDescription: buildJobDescription(values, record?.excerpt?.rendered),
    remoteStatus: normalizeRemoteStatus(values.job_location_type, values.cf_work_location_detail),
  }
}

export const extractSearchResults = (records = []) => {
  if (!Array.isArray(records)) {
    throw new Error('Response is not the verified Data Design jobs feed')
  }

  return records.map((record) => extractJobFromRecord(record))
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: `${SOURCE}-json`,
  timeoutMs: 15000,
})

export const createDataDesignScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  pageSize = 100,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Response is not the verified official Data Design homepage')
    }

    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Response is not the verified official Data Design jobs surface')
    }

    const jobs = []
    let page = 1

    while (true) {
      const payload = await fetchJson(buildListingsApiUrl(page, pageSize))
      if (!Array.isArray(payload)) {
        throw new Error('Response is not the verified Data Design jobs feed')
      }

      if (payload.length === 0) break

      for (const job of extractSearchResults(payload)) {
        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (payload.length < pageSize) break
      page += 1
    }

    return jobs
  },
})

export const run = async (options = {}) => createDataDesignScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total Data Design jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
