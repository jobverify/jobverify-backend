import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { filterIndiaJobs } from '../../scraper-support/utils/indiaLocationFilter.js'
import { inferExperienceFromPublicPageHtml } from '../../scraper-support/utils/publicExperienceEnrichment.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'orioninnovation'
export const COMPANY = 'Orion Innovation'
export const CAREERS_PAGE_URL = 'https://www.orioninnovation.com/careers/life-at-orion/'
export const OPEN_JOBS_URL = 'https://www.orioninnovation.com/careers/job/'
export const JOB_LINK_SELECTOR = 'a[href*="gh_jid="]'
export const JOB_LINK_PATTERN = /^https:\/\/www\.orioninnovation\.com\/careers\/job\/\?gh_jid=\d+$/i

const GREENHOUSE_ERROR_TITLE = 'Jobs at Orion Innovation'
const DEFAULT_FETCH_TIMEOUT_MS = 30000
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[â€“â€”]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  attempts: 1,
  label: SOURCE,
  timeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
})

const uniqueBy = (items, getKey) => {
  const seen = new Set()
  const results = []

  for (const item of items) {
    const key = getKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    results.push(item)
  }

  return results
}

const extractJobIdFromUrl = (value) => {
  try {
    return new URL(value).searchParams.get('gh_jid')
  } catch {
    return null
  }
}

const deriveCountry = (location) => (/\bindia\b/i.test(location || '') ? 'India' : null)

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/^india(?:\b|,)/i.test(normalized)) return 'Remote'

  const firstSegment = normalized.split(',')[0]?.trim()
  return normalizeCity(firstSegment || normalized)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /Life at Orion - Orion Innovation/i.test(page)
    && /Where people grow and innovation thrives/i.test(page)
    && /Explore Opportunities/i.test(page)
    && /\/careers\/job\//i.test(page)
}

export const hasOfficialOpenJobsSignal = (pageData) => {
  const title = normalizeWhitespace(pageData?.title)
  const text = String(pageData?.text ?? '')
  const links = Array.isArray(pageData?.links) ? pageData.links : []

  return title === 'Job - Orion Innovation'
    && /Open Jobs/i.test(text)
    && /\bOpen Positions\b/i.test(text)
    && /Load more/i.test(text)
    && links.some((link) => JOB_LINK_PATTERN.test(normalizeWhitespace(link?.href) || ''))
}

export const extractJobsFromCards = (cards) => {
  const jobs = uniqueBy(
    (Array.isArray(cards) ? cards : [])
      .map((card) => {
        const title = normalizeWhitespace(card?.title)
        const location = normalizeWhitespace(card?.location)
        const department = normalizeWhitespace(card?.category)
        const employmentType = normalizeWhitespace(card?.workType)
        const sourceUrl = normalizeWhitespace(card?.href)
        const jobId = extractJobIdFromUrl(sourceUrl)

        if (!title || !location || !sourceUrl || !jobId || !JOB_LINK_PATTERN.test(sourceUrl)) {
          return null
        }

        return {
          title,
          company: COMPANY,
          department,
          location,
          city: deriveCity(location),
          country: deriveCountry(location),
          jobId,
          requisitionId: jobId,
          sourceUrl,
          applyUrl: sourceUrl,
          employmentType,
          experienceRequired: null,
          minimumQualification: null,
          preferredQualification: null,
          requiredSkills: [],
          postingDate: null,
          closingDate: null,
          jobDescription: null,
        }
      })
      .filter(Boolean),
    (job) => job.sourceUrl,
  )

  return filterIndiaJobs(jobs).map((job) => ({
    ...job,
    country: 'India',
  }))
}

const extractTextFromHtml = (html = '') => decodeHtmlEntities(
  String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
).replace(/\s+/g, ' ').trim()

const extractLinksFromHtml = (html = '', url) => uniqueBy(
  [...String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({
      text: normalizeWhitespace(
        decodeHtmlEntities(String(match[2] ?? '').replace(/<[^>]+>/g, ' ')),
      ),
      href: normalizeWhitespace(
        (() => {
          try {
            return new URL(match[1], url).toString()
          } catch {
            return match[1]
          }
        })(),
      ),
    }))
    .filter((link) => link.text && link.href),
  (link) => `${link.href}|${link.text}`,
)

const fetchRenderedHtml = async (_page, url, { fetchText = defaultFetchText } = {}) =>
  fetchText(url)

export const extractEmbeddedGreenhouseJobAppUrl = (html = '') => normalizeWhitespace(
  decodeHtmlEntities(
    String(html ?? '').match(
      /<iframe\b[^>]*src=["']([^"']*job-boards\.greenhouse\.io\/embed\/job_app[^"']+)["']/i,
    )?.[1],
  ),
)

const extractTitle = (html = '') => normalizeWhitespace(
  String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
)

const isGreenhouseErrorPage = (html = '') => {
  const title = extractTitle(html)
  return title === GREENHOUSE_ERROR_TITLE && /error=true/i.test(String(html ?? ''))
}

const enrichJobFromEmbeddedGreenhouse = async (job, page, fetchRenderedHtmlImpl = fetchRenderedHtml) => {
  let wrapperHtml = null
  try {
    wrapperHtml = await fetchRenderedHtmlImpl(page, job.sourceUrl)
  } catch {
    return job
  }

  const embeddedGreenhouseUrl = extractEmbeddedGreenhouseJobAppUrl(wrapperHtml)
  if (!embeddedGreenhouseUrl) {
    return job
  }

  try {
    const greenhouseHtml = await fetchRenderedHtmlImpl(page, embeddedGreenhouseUrl)
    if (isGreenhouseErrorPage(greenhouseHtml)) {
      return {
        ...job,
        publicExperienceChecked: true,
      }
    }

    const greenhouseInferredJob = inferExperienceFromPublicPageHtml({
      ...job,
      sourceUrl: embeddedGreenhouseUrl,
      applyUrl: embeddedGreenhouseUrl,
      link: embeddedGreenhouseUrl,
    }, greenhouseHtml)

    return {
      ...job,
      description: greenhouseInferredJob.description || job.description || null,
      jobDescription: greenhouseInferredJob.jobDescription || job.jobDescription || null,
      experienceRequired: greenhouseInferredJob.experienceRequired || job.experienceRequired || null,
      publicExperienceChecked: greenhouseInferredJob.publicExperienceChecked === true,
    }
  } catch {
    return {
      ...job,
      publicExperienceChecked: true,
    }
  }
}

const collectPageData = async (_page, url, { fetchText = defaultFetchText } = {}) => {
  const html = await fetchText(url)

  return {
    url,
    title: extractTitle(html),
    text: extractTextFromHtml(html),
    links: extractLinksFromHtml(html, url),
  }
}

const readRenderedJobCards = async (_page, pageData = {}) => {
  const jobLinks = uniqueBy(
    (pageData?.links || [])
      .filter((link) => JOB_LINK_PATTERN.test(normalizeWhitespace(link?.href) || ''))
      .map((link) => ({
        title: normalizeWhitespace(link?.text),
        href: normalizeWhitespace(link?.href),
      }))
      .filter((link) => link.title && link.href),
    (link) => link.href,
  )
  const normalizedText = String(pageData?.text ?? '').replace(/\s+/g, ' ').trim()

  return jobLinks.map((link, index) => {
    const startIndex = normalizedText.indexOf(link.title)
    const nextTitle = jobLinks[index + 1]?.title || null
    const nextIndex = nextTitle ? normalizedText.indexOf(nextTitle, startIndex + link.title.length) : -1
    const segment = startIndex >= 0
      ? normalizedText.slice(startIndex, nextIndex >= 0 ? nextIndex : undefined)
      : link.title

    return {
      title: link.title,
      location: normalizeWhitespace(
        segment.match(/Location:\s*(.+?)(?=\s+Category:|\s+Work Type:|$)/i)?.[1],
      ),
      category: normalizeWhitespace(
        segment.match(/Category:\s*(.+?)(?=\s+Work Type:|$)/i)?.[1],
      ),
      workType: normalizeWhitespace(
        segment.match(/Work Type:\s*(.+?)$/i)?.[1],
      ),
      href: link.href,
    }
  }).filter((card) => card.href)
}

const toCareersSignalText = (pageData = {}) => [
  pageData?.title,
  pageData?.text,
  ...(pageData?.links || []).map((link) => link?.href),
].join(' ')

const finalizeJobs = (jobs = [], now = () => new Date().toISOString()) => jobs.map((job) => ({
  ...job,
  source: SOURCE,
  link: job.applyUrl || job.sourceUrl,
  scrapedAt: now(),
}))

const runApiOnly = async ({
  collectPageDataImpl = collectPageData,
  readRenderedJobCardsImpl = readRenderedJobCards,
  fetchRenderedHtmlImpl = fetchRenderedHtml,
  fetchText = defaultFetchText,
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => {
  const careersPageData = await collectPageDataImpl(null, CAREERS_PAGE_URL, { fetchText })
  if (!hasOfficialCareersSignal(toCareersSignalText(careersPageData))) {
    throw new Error('Orion Innovation careers page no longer matches the verified official public surface')
  }

  const openJobsPageData = await collectPageDataImpl(null, OPEN_JOBS_URL, { fetchText })
  if (!hasOfficialOpenJobsSignal(openJobsPageData)) {
    throw new Error('Orion Innovation open jobs page no longer matches the verified official public surface')
  }

  const jobs = extractJobsFromCards(await readRenderedJobCardsImpl(null, openJobsPageData, { fetchText }))
  const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs
  const jobsWithDetails = []

  for (const job of selectedJobs) {
    jobsWithDetails.push(
      await enrichJobFromEmbeddedGreenhouse(
        job,
        null,
        (page, url) => fetchRenderedHtmlImpl(page, url, { fetchText }),
      ),
    )
  }

  return finalizeJobs(jobsWithDetails, now)
}

export const createOrionInnovationScraper = ({
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    collectPageDataImpl = collectPageData,
    readRenderedJobCardsImpl = readRenderedJobCards,
    fetchRenderedHtmlImpl = fetchRenderedHtml,
    fetchText = defaultFetchText,
  } = {}) {
    return runApiOnly({
      collectPageDataImpl,
      readRenderedJobCardsImpl,
      fetchRenderedHtmlImpl,
      fetchText,
      maxJobs,
      now,
    })
  },
})

export const run = async (options = {}) => createOrionInnovationScraper().run(options)

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
