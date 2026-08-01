import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { BETSOL_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const BOARD_URL = PROVIDER_METADATA.boardUrl
export { PROVIDER_METADATA }

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasVerifiedBoardSignal = (html) => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Jobs at Betsol LLC')
    && normalized.includes('Bengaluru, India')
    && normalized.includes('Telecom Voice Operations Engineer')
    && normalized.includes('ServiceNow QA Engineer')
    && (/href="https:\/\/www\.betsol\.com\/"/i.test(String(html ?? ''))
      || normalized.includes('Home Page'))
}

export const extractBoardJobs = (html) =>
  Array.from(
    String(html ?? '').matchAll(
      /<section[^>]*class="openings-section[^"]*">([\s\S]*?)<\/section>/gi,
    ),
    (sectionMatch) => {
      const sectionHtml = sectionMatch[1]
      const location = normalizeWhitespace(
        sectionHtml.match(/<h3[^>]*>([^<]+)<\/h3>/i)?.[1],
      )
      if (!location) {
        return []
      }

      return Array.from(
        sectionHtml.matchAll(
          /<a href="([^"]+jobs\.smartrecruiters\.com\/Betsol\/([^"]+))"[^>]*>[\s\S]*?<h4[^>]*>([^<]+)<\/h4>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi,
        ),
        (jobMatch) => ({
          title: normalizeWhitespace(jobMatch[3]),
          jobId: normalizeWhitespace(jobMatch[2]),
          experienceLevel: normalizeWhitespace(jobMatch[4]) || null,
          location,
          city: normalizeWhitespace(location.split(',')[0]) || null,
          country: normalizeWhitespace(location.split(',')[1]) || null,
          applyUrl: jobMatch[1],
          sourceUrl: jobMatch[1],
          link: jobMatch[1],
        }),
      )
    },
  )
    .flat()
    .filter((job) => job.title && job.jobId)

export const createBetsolScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const boardHtml = await fetchText(BOARD_URL)
    if (!hasVerifiedBoardSignal(boardHtml)) {
      throw new Error('BETSOL SmartRecruiters board changed materially')
    }

    return extractBoardJobs(boardHtml)
      .filter((job) => /india/i.test(job.location))
      .sort((left, right) => left.title.localeCompare(right.title))
      .map((job) => ({
        title: job.title,
        company: COMPANY,
        location: job.location,
        city: job.city,
        country: job.country,
        jobId: job.jobId,
        sourceUrl: job.sourceUrl,
        applyUrl: job.applyUrl,
        experienceLevel: job.experienceLevel,
        jobDescription: null,
        source: SOURCE,
        link: job.link,
        scrapedAt: now(),
      }))
  },
})

export const run = async (options = {}) => createBetsolScraper(options).run(options)

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
