import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { PUBMATIC_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export { PROVIDER_METADATA }

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_LOCATIONS = {
  'Gurugram, IN': { city: 'Gurugram', state: 'Haryana', country: 'India' },
  'Pune, IN': { city: 'Pune', state: 'Maharashtra', country: 'India' },
}

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

export const hasOfficialJobsSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('OPPORTUNITY. DELIVERED.')
    && normalized.includes('62 open positions')
    && normalized.includes('Gurugram, IN')
}

export const extractLocationGroups = (html = '') =>
  Array.from(
    String(html ?? '').matchAll(
      /<section[\s\S]*?<h4>([^<]+)<\/h4>([\s\S]*?)<\/section>/gi,
    ),
    (match) => {
      const location = decodeHtml(match[1])
      const body = match[2]
      const jobs = Array.from(
        body.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/gi),
        (jobMatch) => ({
          title: decodeHtml(jobMatch[2]),
          applyUrl: decodeHtml(jobMatch[1]),
        }),
      ).filter((job) => job.title && job.applyUrl)

      return {
        location,
        jobs,
      }
    },
  ).filter((group) => group.location && group.jobs.length > 0)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createPubMaticScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    if (!hasOfficialJobsSignal(html)) {
      throw new Error('PubMatic first-party jobs page changed materially')
    }

    return extractLocationGroups(html)
      .flatMap((group) => {
        const locationMeta = INDIA_LOCATIONS[group.location]
        if (!locationMeta) return []

        return group.jobs.map((job) => ({
          title: job.title,
          company: COMPANY,
          location: `${locationMeta.city}, ${locationMeta.state}, ${locationMeta.country}`,
          city: locationMeta.city,
          state: locationMeta.state,
          country: locationMeta.country,
          jobId: slugify(job.title),
          sourceUrl: job.applyUrl,
          applyUrl: job.applyUrl,
          jobDescription: null,
          source: SOURCE,
          link: job.applyUrl,
          scrapedAt: now(),
        }))
      })
      .sort((left, right) => left.title.localeCompare(right.title))
  },
})

export const run = async (options = {}) => createPubMaticScraper(options).run(options)

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
