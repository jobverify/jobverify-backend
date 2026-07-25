import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'

import { RAILTEL_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const insecureHttpsAgent = new https.Agent({ rejectUnauthorized: false })

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const MAX_REDIRECTS = 5

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

const requestTextAllowingInsecureTls = (url, redirectCount = 0) =>
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
        const body = Buffer.concat(chunks).toString('utf8')
        const location = response.headers.location

        if (
          location
          && REDIRECT_STATUSES.has(response.statusCode ?? 0)
          && redirectCount < MAX_REDIRECTS
        ) {
          try {
            resolve(await requestTextAllowingInsecureTls(new URL(location, targetUrl).toString(), redirectCount + 1))
            return
          } catch (error) {
            reject(error)
            return
          }
        }

        resolve(body)
      })
    })

    request.setTimeout(15000, () => {
      request.destroy(new Error(`Timed out fetching ${url}`))
    })

    request.on('error', reject)
    request.end()
  })

const splitIntoTableBlocks = (html) =>
  String(html ?? '')
    .split(/(?=<table\b[^>]*class=["']railtel_table["'][^>]*>)/i)
    .filter((block) => /class=["']railtel_table["']/i.test(block))

const extractHeading = (block) => normalizeWhitespace(
  String(block ?? '').match(/<tr class=["']heading["'][\s\S]*?<td>([\s\S]*?)<\/td>/i)?.[1] ?? null,
)

const extractLinks = (block) => [...String(block ?? '').matchAll(
  /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
)]
  .map((match) => ({
    href: toAbsoluteUrl(match[1]),
    text: normalizeWhitespace(match[2]),
  }))
  .filter((link) => link.href && link.text)

const isNoiseTitle = (title) => normalizeWhitespace(title) === 'S.No'

const isResultLink = (value) =>
  /(result|shortlisted|provisionally|cut-?off|objection|admit card|mock test|interview schedule|empanelled|medical|final result)/i.test(
    String(value ?? ''),
  )

const isSupportLink = (value) =>
  /(proforma|performa|annexure|certificate|format)/i.test(String(value ?? ''))

const isPrimaryNoticeLink = (value) =>
  /(detailed vacancy|vacancy notice|vacancy notification|recruitment|advertisement notice|walk-?in interview|apprenticeship training)/i.test(
    String(value ?? ''),
  )

const selectSourceLink = (links) =>
  links.find((link) => isPrimaryNoticeLink(link.text) && !isResultLink(link.text))
  || links.find((link) => !isSupportLink(link.text) && !isResultLink(link.text))
  || links[0]
  || null

const selectApplyLink = (links, sourceLink) =>
  links.find((link) => /click here to apply|application form/i.test(link.text))
  || sourceLink
  || null

const inferEmploymentType = (title) => {
  const normalized = String(title ?? '')
  if (/contract basis/i.test(normalized)) return 'Contract'
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

export const hasOfficialCurrentJobsSignal = (html) => {
  const page = String(html ?? '')
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
      if (!title || isNoiseTitle(title)) return null

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
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = requestTextAllowingInsecureTls } = {}) {
    const html = await fetchText(CURRENT_JOBS_URL)

    if (!hasOfficialCurrentJobsSignal(html)) {
      throw new Error('RailTel verified current openings page no longer matches the trusted public surface')
    }

    const jobs = extractCurrentJobs(html)
    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs
    if (selectedJobs.length === 0) {
      throw new Error('RailTel verified current openings page no longer exposes vacancy tables')
    }

    return selectedJobs.map((job) => ({
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
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: job.jobDescription,
      remoteStatus: job.remoteStatus,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createRailTelScraper(options).run(options)

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
