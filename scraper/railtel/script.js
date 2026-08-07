import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { inferExperienceFromPublicPageHtml } from '../../scraper-support/utils/publicExperienceEnrichment.js'
import { extractTextFromPdfBuffer } from '../../scraper-support/shared/pdfText.js'
import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'

import { RAILTEL_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const insecureHttpsAgent = new https.Agent({ rejectUnauthorized: false })

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const MAX_REDIRECTS = 5
const DEFAULT_DETAIL_FETCH_CONCURRENCY = 8
const PDF_CONTENT_TYPE_PATTERN = /application\/pdf/i
const NON_OPENING_TITLE_PATTERN =
  /\b(?:sc\/st certificate|obc certificate|training calendar|refund of application fees|termination of service|result notification)\b/i
const RAILTEL_NOTICE_SECTION_END_PATTERN =
  /\b(?:note cut off date|web address|closing date|candidates may apply|zonal railway|applications received|advise all eligible)\b/i
const RAILTEL_SERVICE_YEAR_CONTEXT_PATTERN =
  /\b(?:gaz(?:etted)?|gaz\b|gr\.?\s*'?a'?|group\s*[ab]|service|sag|sg|nfhag|level-\d+)\b/i

export const SOURCE = RAILTEL_CATALOG.source
export const COMPANY = RAILTEL_CATALOG.companyName
export const VERIFIED_ON = RAILTEL_CATALOG.verifiedOn
export const PROVIDER_METADATA = RAILTEL_CATALOG
export const CURRENT_JOBS_URL = RAILTEL_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_HUB_URL = RAILTEL_CATALOG.officialCareersHubUrl

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/section|\/article|\/main|\/h[1-6]|\/a|\/span)\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const stripHtmlComments = (value) => String(value ?? '').replace(/<!--[\s\S]*?-->/g, ' ')

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || null

const toAbsoluteUrl = (value) => {
  try {
    return new URL(String(value ?? ''), CURRENT_JOBS_URL).toString()
  } catch {
    return null
  }
}

const isPdfUrl = (url, contentType = '') =>
  PDF_CONTENT_TYPE_PATTERN.test(String(contentType ?? ''))
  || /\.pdf(?:$|\?)/i.test(String(url ?? ''))

const requestBufferAllowingInsecureTls = (url, redirectCount = 0) =>
  new Promise((resolve, reject) => {
    const targetUrl = new URL(url)
    const transport = targetUrl.protocol === 'http:' ? http : https

    const request = transport.request(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      agent: targetUrl.protocol === 'https:' ? insecureHttpsAgent : undefined,
    }, (response) => {
      const chunks = []

      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', async () => {
        const body = Buffer.concat(chunks)
        const location = response.headers.location

        if (
          location
          && REDIRECT_STATUSES.has(response.statusCode ?? 0)
          && redirectCount < MAX_REDIRECTS
        ) {
          try {
            resolve(await requestBufferAllowingInsecureTls(new URL(location, targetUrl).toString(), redirectCount + 1))
            return
          } catch (error) {
            reject(error)
            return
          }
        }

        resolve({
          body,
          contentType: response.headers['content-type'] || '',
          url: targetUrl.toString(),
        })
      })
    })

    request.setTimeout(15000, () => {
      request.destroy(new Error(`Timed out fetching ${url}`))
    })

    request.on('error', reject)
    request.end()
  })

const requestTextAllowingInsecureTls = async (url) => {
  const response = await requestBufferAllowingInsecureTls(url)
  return response.body.toString('utf8')
}

const requestDocumentTextAllowingInsecureTls = async (url) => {
  const response = await requestBufferAllowingInsecureTls(url)

  if (isPdfUrl(response.url, response.contentType)) {
    return extractTextFromPdfBuffer(response.body)
  }

  return response.body.toString('utf8')
}

const splitIntoTableBlocks = (html) =>
  stripHtmlComments(html)
    .split(/(?=<table\b[^>]*class=["']railtel_table["'][^>]*>)/i)
    .filter((block) => /class=["']railtel_table["']/i.test(block))

const extractHeading = (block) => normalizeWhitespace(
  String(block ?? '').match(/<tr class=["']heading["'][\s\S]*?<td>([\s\S]*?)<\/td>/i)?.[1] ?? null,
)

const extractLinks = (block) => [...String(block ?? '').matchAll(
  /<a\b[^>]*href=(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
)]
  .map((match) => ({
    href: toAbsoluteUrl(String(match[2] ?? '').replace(/\s+/g, ' ').trim()),
    text: normalizeWhitespace(match[3]),
  }))
  .filter((link) => link.href && link.text)

const isNoiseTitle = (title) => normalizeWhitespace(title) === 'S.No'
const isNonOpeningTitle = (title) => NON_OPENING_TITLE_PATTERN.test(String(title ?? ''))

const isResultLink = (value) =>
  /(result|shortlisted|provisionally|cut-?off|objection|admit card|mock test|interview schedule|empanelled|medical examination|pre-appointment medical|final result)/i.test(
    String(value ?? ''),
  )

const isSupportLink = (value) =>
  /(proforma|performa|annexure|certificate|format)/i.test(String(value ?? ''))

const isPrimaryNoticeLink = (value) =>
  /(detailed vacancy|vacancy notice|vacancy notification|re-?circulation of vacancy notice|notice for engagement|recruitment|advertisement notice|walk-?in interview|apprenticeship training)/i.test(
    String(value ?? ''),
  )

const looksLikeBrokenCareersDirectoryUrl = (value) =>
  /\/images\/careers\/?$/i.test(String(value ?? ''))

const selectSourceLink = (links) =>
  links.find((link) =>
    isPrimaryNoticeLink(link.text)
    && !isResultLink(link.text)
    && !looksLikeBrokenCareersDirectoryUrl(link.href),
  )
  || links.find((link) =>
    !isSupportLink(link.text)
    && !isResultLink(link.text)
    && !looksLikeBrokenCareersDirectoryUrl(link.href),
  )
  || null

const selectApplyLink = (links, sourceLink) =>
  links.find((link) => /click here to apply|application form/i.test(link.text))
  || sourceLink
  || null

const inferEmploymentType = (title) => {
  const normalized = String(title ?? '')
  if (/contract(?:ual)? basis/i.test(normalized)) return 'Contract'
  if (/regular recruitment/i.test(normalized)) return 'Full-time'
  return null
}

const inferLocation = (title) => {
  const atMatch = normalizeWhitespace(title)?.match(/\bat\s+([^.;]+)$/i)
  if (!atMatch) {
    return {
      location: null,
      city: null,
      country: 'India',
    }
  }

  const label = normalizeWhitespace(atMatch[1])
  const city = normalizeWhitespace(label?.split(',')[0] ?? null)

  return {
    location: label ? `${label}, India` : null,
    city: city || null,
    country: 'India',
  }
}

const buildJobDescription = (title, sourceLink, applyLink) => {
  const parts = []
  const sourceText = normalizeWhitespace(sourceLink?.text)
  const applyText = normalizeWhitespace(applyLink?.text)
  const normalizedTitle = normalizeWhitespace(title)

  if (sourceText) {
    parts.push(sourceText)
  } else if (normalizedTitle) {
    parts.push(normalizedTitle)
  }

  if (applyText && applyText !== sourceText) {
    parts.push(applyText)
  }

  return parts.join(' ') || null
}

const extractNoticeSection = (noticeText, startPattern) => {
  const normalized = normalizeWhitespace(noticeText)
  if (!normalized) return null

  const startMatch = startPattern.exec(normalized)
  if (!startMatch) return null

  const tail = normalized.slice(startMatch.index)
  const endMatch = RAILTEL_NOTICE_SECTION_END_PATTERN.exec(tail)
  return normalizeWhitespace(endMatch ? tail.slice(0, endMatch.index) : tail)
}

const stripAdministrativeNoticeText = (noticeText) => normalizeWhitespace(
  normalizeWhitespace(noticeText)
    .replace(/\bage\b[\s\S]{0,180}?\b\d+\s*(?:years?|yrs?)\b/gi, ' ')
    .replace(/\bshould not exceed\b[\s\S]{0,100}?\b\d+\s*(?:years?|yrs?)\b/gi, ' ')
    .replace(/\bapars?\b[\s\S]{0,140}?\b\d+\s*(?:years?|yrs?)\b/gi, ' ')
    .replace(/\bduration\b[\s\S]{0,160}?\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s*(?:years?|yrs?)\b/gi, ' ')
    .replace(/\bclosing date\b[\s\S]{0,120}?\b\d+\s*(?:days?|months?|years?|yrs?)\b/gi, ' ')
    .replace(/\bnote cut off date\b[\s\S]{0,240}/gi, ' ')
    .replace(/\blast\s+\d+\s*(?:years?|yrs?)\b/gi, ' '),
)

const formatExperienceEvidence = (experienceProfile = {}) => {
  const evidence = normalizeWhitespace(experienceProfile?.evidence)
  if (!evidence || experienceProfile?.confidence !== 'high') {
    return null
  }

  return (
    experienceProfile.minimumYears === 0 && experienceProfile.maximumYears === 0
      ? 'No experience required'
      : evidence
  )
}

const extractHighConfidenceExperience = (noticeText) => {
  const normalized = normalizeWhitespace(noticeText)
  if (!normalized) return null

  const experienceProfile = extractJobFilterSignals({
    description: normalized,
  })?.experienceProfile
  const evidence = formatExperienceEvidence(experienceProfile)
  if (!evidence) return null
  if (
    (experienceProfile.minimumYears != null && experienceProfile.minimumYears > 40)
    || (experienceProfile.maximumYears != null && experienceProfile.maximumYears > 40)
  ) {
    return null
  }

  return evidence
}

const extractServiceYearsFromEligibilitySection = (noticeText) => {
  const section = extractNoticeSection(
    noticeText,
    /\bminimum el(?:igibility|igubility|elgubility|eligubility|elgibility)\b/i,
  )
  if (!section) return null

  const serviceYears = [...section.matchAll(
    /(?<!\d)(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b([\s\S]{0,40}?)(?=(?:\b\d+\s*(?:years?|yrs?)\b|$))/gi,
  )]
    .map((match) => ({
      years: Number.parseFloat(match[1]),
      context: normalizeWhitespace(match[2]),
    }))
    .filter((match) =>
      Number.isFinite(match.years)
      && match.years > 0
      && match.years <= 40
      && RAILTEL_SERVICE_YEAR_CONTEXT_PATTERN.test(match.context),
    )
    .map((match) => match.years)

  if (serviceYears.length === 0) return null

  return `${Math.min(...serviceYears)}+ years`
}

const extractRailTelExperienceRequired = (noticeText) => {
  const normalized = normalizeWhitespace(noticeText)
  if (!normalized) return null

  const specificRequirementsExperience = extractHighConfidenceExperience(
    extractNoticeSection(normalized, /\bspecific requirements?\b/i),
  )
  if (specificRequirementsExperience) {
    return specificRequirementsExperience
  }

  const serviceExperience = extractServiceYearsFromEligibilitySection(normalized)
  if (serviceExperience) {
    return serviceExperience
  }

  return extractHighConfidenceExperience(stripAdministrativeNoticeText(normalized))
}

const mapWithConcurrency = async (items, concurrency, mapper) => {
  const results = new Array(items.length)
  const limit = Math.max(1, Math.min(items.length, concurrency))
  let cursor = 0

  const worker = async () => {
    while (cursor < items.length) {
      const currentIndex = cursor
      cursor += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}

const memoizeFetchDocumentText = (fetchDocumentText) => {
  const cache = new Map()

  return async (url) => {
    if (!cache.has(url)) {
      cache.set(url, Promise.resolve().then(() => fetchDocumentText(url)))
    }

    try {
      return await cache.get(url)
    } catch (error) {
      cache.delete(url)
      throw error
    }
  }
}

const enrichJobFromNoticeText = async (job, fetchDocumentText) => {
  const noticeUrl = job.sourceUrl || job.applyUrl
  if (!noticeUrl || typeof fetchDocumentText !== 'function') return job

  try {
    const noticeText = normalizeWhitespace(await fetchDocumentText(noticeUrl))
    if (!noticeText) return job
    const noticeSummary = normalizeWhitespace(job.description || job.jobDescription || job.title)
    const railTelExperienceRequired = extractRailTelExperienceRequired(noticeText)

    const syntheticNoticeHtml = `
      <html>
        <head>
          <title>${escapeHtml(job.title || '')}</title>
          ${noticeSummary ? `<meta name="description" content="${escapeHtml(noticeSummary)}">` : ''}
          ${noticeSummary ? `<meta property="og:description" content="${escapeHtml(noticeSummary)}">` : ''}
        </head>
        <body>
          <h1>${escapeHtml(job.title || '')}</h1>
          <article>${escapeHtml(noticeText)}</article>
        </body>
      </html>
    `

    const enriched = inferExperienceFromPublicPageHtml({
      ...job,
      company: COMPANY,
      source: SOURCE,
    }, syntheticNoticeHtml)

    return {
      ...job,
      experienceRequired: railTelExperienceRequired || job.experienceRequired,
      description: enriched.description || job.description || job.jobDescription,
      jobDescription: enriched.jobDescription || job.jobDescription,
      publicExperienceChecked:
        Boolean(noticeText)
        || enriched.publicExperienceChecked === true
        || job.publicExperienceChecked === true,
    }
  } catch {
    return job
  }
}

export const hasOfficialCurrentJobsSignal = (html) => {
  const page = stripHtmlComments(html)
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Current Job Openings\s*<\/title>/i.test(page)
    && /Junior Translator/i.test(normalized)
    && /Detailed Vacancy Notice No\. RCIL\/2025\/P&A\/44\/3/i.test(normalized)
    && /Click here to apply/i.test(normalized)
}

export const extractCurrentJobs = (html) =>
  splitIntoTableBlocks(html)
    .map((block) => {
      const title = extractHeading(block)
      if (!title || isNoiseTitle(title) || isNonOpeningTitle(title)) return null

      const links = extractLinks(block)
      const sourceLink = selectSourceLink(links)
      const applyLink = selectApplyLink(links, sourceLink)
      if (!sourceLink || !applyLink) return null

      const location = inferLocation(title)
      const jobId = slugify(title)
      if (!jobId) return null

      return {
        title,
        location: location.location,
        city: location.city,
        country: location.country,
        jobId,
        requisitionId: jobId,
        sourceUrl: sourceLink.href,
        applyUrl: applyLink.href,
        employmentType: inferEmploymentType(title),
        jobDescription: buildJobDescription(title, sourceLink, applyLink),
        remoteStatus: null,
      }
    })
    .filter(Boolean)

export const createRailTelScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  detailFetchConcurrency = DEFAULT_DETAIL_FETCH_CONCURRENCY,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = requestTextAllowingInsecureTls, fetchDocumentText = null } = {}) {
    const html = await fetchText(CURRENT_JOBS_URL)

    if (!hasOfficialCurrentJobsSignal(html)) {
      throw new Error('RailTel verified current openings page no longer matches the trusted public surface')
    }

    const jobs = extractCurrentJobs(html)
    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs
    if (selectedJobs.length === 0) {
      throw new Error('RailTel verified current openings page no longer exposes vacancy tables')
    }

    const detailFetcher = fetchDocumentText
      || (fetchText === requestTextAllowingInsecureTls ? requestDocumentTextAllowingInsecureTls : null)
    const memoizedDetailFetcher = detailFetcher
      ? memoizeFetchDocumentText(detailFetcher)
      : null
    const jobsWithNoticeDetails = detailFetcher
      ? await mapWithConcurrency(
          selectedJobs,
          detailFetchConcurrency,
          (job) => enrichJobFromNoticeText(job, memoizedDetailFetcher),
        )
      : selectedJobs

    return jobsWithNoticeDetails.map((job) => ({
      title: job.title,
      company: COMPANY,
      department: null,
      location: job.location,
      city: job.city,
      country: job.country,
      jobId: job.jobId,
      requisitionId: job.requisitionId,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      employmentType: job.employmentType,
      experienceRequired: job.experienceRequired || null,
      minimumQualification: null,
      preferredQualification: job.preferredQualification || null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      description: job.description || job.jobDescription || null,
      jobDescription: job.jobDescription,
      remoteStatus: job.remoteStatus,
      publicExperienceChecked: job.publicExperienceChecked === true,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createRailTelScraper(options).run(options)

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
