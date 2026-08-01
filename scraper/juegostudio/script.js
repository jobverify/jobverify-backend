import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { JUEGO_STUDIO_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export { PROVIDER_METADATA }

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const decodeHtml = (value) => normalizeWhitespace(value)

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('OPEN POSITIONS')
    && normalized.includes('3D Artist I / II')
    && normalized.includes('Apply Now')
}

export const extractOpenPositions = (html = '') =>
  Array.from(
    String(html ?? '').matchAll(
      /<section class="job">[\s\S]*?<h5>([^<]+)<\/h5>[\s\S]*?<h5>([^<]*)<\/h5>[\s\S]*?<h6>Department:<\/h6>\s*<p>([^<]*)<\/p>[\s\S]*?<h6>Position:<\/h6>\s*<p>([^<]*)<\/p>[\s\S]*?<h6>Relevant Experience:<\/h6>\s*<p>([^<]*)<\/p>[\s\S]*?<a href="([^"]+)">Apply Now<\/a>[\s\S]*?<\/section>/gi,
    ),
    (match) => ({
      title: decodeHtml(match[1]),
      city: decodeHtml(match[2]) || null,
      department: decodeHtml(match[3]) || null,
      positionTitle: decodeHtml(match[4]) || null,
      experienceRequired: decodeHtml(match[5]) || null,
      applyUrl: decodeHtml(match[6]),
    }),
  )
    .filter((job) => job.title && job.applyUrl)
    .map((job) => ({
      ...job,
      location: job.city ? `${job.city}, Karnataka, India` : 'India',
      country: 'India',
      state: job.city ? 'Karnataka' : null,
      jobId: slugify(job.title),
      sourceUrl: job.applyUrl,
      link: job.applyUrl,
    }))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const createJuegoStudioScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    const fetchPageText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    try {
      const html = await fetchPageText(CAREERS_URL)

      if (!hasOfficialCareersSignal(html)) {
        throw new Error('Juego Studio careers page changed materially')
      }

      return extractOpenPositions(html)
        .sort((left, right) => left.title.localeCompare(right.title))
        .map((job) => ({
          title: job.title,
          company: COMPANY,
          location: job.location,
          city: job.city,
          state: job.state,
          country: job.country,
          department: job.department,
          positionTitle: job.positionTitle,
          experienceRequired: job.experienceRequired,
          jobId: job.jobId,
          sourceUrl: job.sourceUrl,
          applyUrl: job.applyUrl,
          jobDescription: null,
          source: SOURCE,
          link: job.link,
          scrapedAt: now(),
        }))
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createJuegoStudioScraper(options).run(options)

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
