import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'
import { withRetry } from '../../scraper-support/utils/retry.js'

import { TECHTREE_IT_SYSTEMS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchPage = (url) => withRetry(async () => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(20000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}, {
  attempts: 3,
  baseDelayMs: 2000,
  label: SOURCE,
})

const defaultFetchJson = (url) => withRetry(async () => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(20000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}, {
  attempts: 3,
  baseDelayMs: 2000,
  label: SOURCE,
})

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(value)

const extractVisibleText = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<\/(p|div|section|article|li|h[1-6]|ul|ol|main|header|footer)>/gi, '\n')
  .replace(/<(br|hr)\b[^>]*\/?>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n')
  .replace(/<p\b[^>]*>/gi, '\n')
  .replace(/<div\b[^>]*>/gi, '\n')
  .replace(/<section\b[^>]*>/gi, '\n')
  .replace(/<article\b[^>]*>/gi, '\n')
  .replace(/<h[1-6]\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const extractSpecificationTerms = (cardHtml, type) => {
  const section = cardHtml.match(
    new RegExp(
      `<div\\b[^>]*class=["'][^"']*awsm-job-specification-${type}[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`,
      'i',
    ),
  )?.[1]

  if (!section) return []

  return [...section.matchAll(/awsm-job-specification-term">([\s\S]*?)</gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
}

const formatLocation = (locations) => `${locations.join(' / ')}, India`

const buildDetailApiUrl = (postId) => {
  if (!postId) return null

  return `https://www.techtreeit.com/wp-json/wp/v2/awsm_job_openings/${encodeURIComponent(String(postId))}`
}

const inferExperienceFromDescription = (jobDescription) => {
  const normalizedDescription = normalizeWhitespace(jobDescription)
  if (!normalizedDescription) return null

  const experienceProfile = extractJobFilterSignals({
    description: normalizedDescription,
  })?.experienceProfile
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

const isSameOfficialDomain = (value) => {
  try {
    const hostname = new URL(String(value ?? CAREERS_URL)).hostname.toLowerCase()
    return hostname === 'techtreeit.com' || hostname === 'www.techtreeit.com'
  } catch {
    return false
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers\s*\|\s*TechTree IT System Pvt Ltd\s*<\/title>/i.test(page)
    && text.includes('CAREERS')
    && text.includes('All Job Category')
    && /awsm-job-listings/i.test(page)
    && /awsm-job-post-title/i.test(page)
    && /More Details/i.test(page)
}

export const hasSucuriChallengeSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*You are being redirected\.\.\.\s*<\/title>/i.test(page)
    && /sucuri_cloudproxy_js/i.test(page)
    && text.includes('Javascript is required. Please enable javascript before you are allowed to see this page.')
}

export const isVerifiedCareersPage = ({ status, url, html } = {}) =>
  [200, 500].includes(Number(status))
  && isSameOfficialDomain(url)
  && hasOfficialCareersSignal(html)

export const isVerifiedSucuriChallengePage = ({ status, url, html } = {}) =>
  [200, 307, 403].includes(Number(status))
  && isSameOfficialDomain(url)
  && hasSucuriChallengeSignal(html)

export const extractJobCards = (html = '') => {
  const page = String(html ?? '')
  const cards = []

  for (const match of page.matchAll(/<div class="awsm-job-listing-item awsm-list-item"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi)) {
    const cardHtml = match[0]
    const postId = cardHtml.match(/id="awsm-list-item-(\d+)"/i)?.[1] || null
    const sourceUrl = toAbsoluteUrl(cardHtml.match(/<a href="([^"]+)"[^>]*>\s*[^<]+/i)?.[1])
    const title = stripTags(cardHtml.match(/<h2 class="awsm-job-post-title">([\s\S]*?)<\/h2>/i)?.[1])
    const employmentType = extractSpecificationTerms(cardHtml, 'job-type')[0] || null
    const locations = extractSpecificationTerms(cardHtml, 'job-location')

    if (!sourceUrl || !title || locations.length === 0 || !postId) continue

    cards.push({
      title,
      employmentType,
      locations,
      location: formatLocation(locations),
      city: locations[0],
      sourceUrl,
      applyUrl: sourceUrl,
      postId,
    })
  }

  return cards
}

export const enrichJobWithDetailJson = (job, detailPayload = {}) => {
  const detailHtml = detailPayload?.content?.rendered || ''
  const jobDescription = extractVisibleText(detailHtml) || null

  return {
    ...job,
    jobDescription,
    experienceRequired: inferExperienceFromDescription(jobDescription) || null,
    publicExperienceChecked: Boolean(jobDescription),
  }
}

export const createTechtreeItSystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)

    if (!isVerifiedCareersPage(careersPage)) {
      try {
        const homepagePage = await fetchPage(HOMEPAGE_URL)

        if (
          isVerifiedSucuriChallengePage(careersPage)
          && isVerifiedSucuriChallengePage(homepagePage)
        ) {
          return []
        }
      } catch {
        // Fall through to the fail-closed verified-surface error below.
      }

      throw new Error('Techtree It Systems verified careers page changed materially')
    }

    const cards = extractJobCards(careersPage.html)
    if (cards.length === 0) {
      throw new Error('Techtree It Systems careers page no longer exposes trusted inline wp-job-openings cards')
    }

    const jobs = []

    for (const card of cards) {
      const baseJob = {
        title: card.title,
        company: COMPANY,
        location: card.location,
        city: card.city,
        locations: card.locations,
        country: 'India',
        employmentType: card.employmentType,
        sourceUrl: card.sourceUrl,
        applyUrl: card.applyUrl,
        link: card.applyUrl,
        jobId: new URL(card.sourceUrl).pathname.split('/').filter(Boolean).at(-1),
        requisitionId: new URL(card.sourceUrl).pathname.split('/').filter(Boolean).at(-1),
        source: SOURCE,
        scrapedAt: now(),
        companyCareerPage: CAREERS_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
      }

      try {
        const detailPayload = await fetchJson(buildDetailApiUrl(card.postId))
        jobs.push(enrichJobWithDetailJson(baseJob, detailPayload))
      } catch {
        jobs.push(baseJob)
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createTechtreeItSystemsScraper(options).run(options)

const isDirectExecution = (() => {
  if (!process.argv[1]) return false

  try {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  } catch {
    return false
  }
})()

if (isDirectExecution) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
