import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { TALENTICA_SOFTWARE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = TALENTICA_SOFTWARE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toAbsoluteTalenticaUrl = (value) => {
  try {
    const url = new URL(value, CAREERS_URL)
    if (!/^(www\.)?talentica\.com$/i.test(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  return /<title>\s*Job Openings\s*\|\s*Talentica\.com\s*<\/title>/i.test(rawHtml)
    && /Current Openings/i.test(rawHtml)
    && /job-card/i.test(rawHtml)
    && /jobdescription\//i.test(rawHtml)
}

export const extractJobCards = (html = '') =>
  [...String(html ?? '').matchAll(
    /<div[^>]*class=["'][^"']*\bjob-card\b[^"']*["'][^>]*>[\s\S]*?<h6[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/h6>[\s\S]*?<p[^>]*>\s*<b>\s*Experience:\s*<\/b>\s*([\s\S]*?)<\/p>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*\banchor-absolute\b[^"']*["'][^>]*>/gi,
  )]
    .map((match) => {
      const title = normalizeWhitespace(match[1])
      const experience = normalizeWhitespace(match[2])
      const detailUrl = toAbsoluteTalenticaUrl(match[3])

      if (!title || !experience || !detailUrl) return null

      return {
        title,
        experience,
        location: null,
        sourceUrl: detailUrl,
        applyUrl: detailUrl,
      }
    })
    .filter(Boolean)

export const createTalenticaSoftwareScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    const jobCards = extractJobCards(careersHtml)

    if (!hasOfficialCareersSignal(careersHtml) || jobCards.length === 0) {
      throw new Error('Talentica verified first-party job openings page changed materially')
    }

    return jobCards.map((job) => ({
      ...job,
      company: COMPANY,
      country: 'India',
      link: job.applyUrl,
      source: SOURCE,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createTalenticaSoftwareScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
