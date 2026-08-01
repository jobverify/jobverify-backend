import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { INFORMATION_EVOLUTION_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = INFORMATION_EVOLUTION_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const JOBS_URL = PROVIDER_METADATA.jobsPageUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtml(String(value ?? ''))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const buildAbsoluteUrl = (value) => {
  try {
    return new URL(String(value ?? ''), JOBS_URL).toString()
  } catch {
    return null
  }
}

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return undefined

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(15000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialJobsSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('jobs')
    && normalized.includes('information evolution inc')
    && normalized.includes('join our team')
}

export const extractJobCards = (html) => {
  const cards = []
  const seen = new Set()

  for (const match of String(html ?? '').matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<\/body>)/gi)) {
    const location = normalizeWhitespace(match[1])
    if (!/india/i.test(location)) continue

    for (const linkMatch of match[2].matchAll(/<a[^>]+href=["']([^"']*\/job\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const detailUrl = buildAbsoluteUrl(linkMatch[1])
      const title = normalizeWhitespace(linkMatch[2])
      if (!detailUrl || !title || seen.has(detailUrl)) continue

      seen.add(detailUrl)
      cards.push({ title, detailUrl, location })
    }
  }

  if (cards.length === 0) {
    throw new Error('Expected verified Information Evolution jobs page with India openings')
  }

  return cards
}

export const extractJobDetail = (html, listing) => {
  const page = String(html ?? '')
  const title = normalizeWhitespace(
    page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      || page.match(/<title[^>]*>(.*?)\s*[-–]/i)?.[1],
  )
  const location = normalizeWhitespace(page.match(/Location:\s*([\s\S]*?)\s*(?:Type:|<\/p>)/i)?.[1])
  const employmentType = normalizeWhitespace(page.match(/Type:\s*([\s\S]*?)\s*<\/p>/i)?.[1]) || null
  const applyUrl = buildAbsoluteUrl(page.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply/i)?.[1])
    || page.match(/href=["'](mailto:[^"']+)["']/i)?.[1]
    || null
  const description = normalizeWhitespace(
    page.match(/<div[^>]*class=["'][^"']*job-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1],
  )

  if (!title || !location) {
    throw new Error(`Expected verified Information Evolution detail page for ${listing.title}`)
  }

  return {
    title,
    company: COMPANY,
    location,
    city: location.split(',')[0]?.trim() || null,
    state: location.split(',')[1]?.trim() || null,
    country: 'India',
    jobId: listing.detailUrl.match(/\/job\/([^/]+)\/?$/)?.[1] || null,
    requisitionId: null,
    sourceUrl: listing.detailUrl,
    applyUrl,
    employmentType,
    jobDescription: description || `Apply via the Information Evolution detail page for ${title}.`,
  }
}

export const createInformationEvolutionScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date() } = {}) {
    const jobsPageHtml = await fetchText(JOBS_URL)
    if (!hasOfficialJobsSignal(jobsPageHtml)) {
      throw new Error('Information Evolution verified jobs page no longer matches the trusted first-party surface')
    }

    const listings = extractJobCards(jobsPageHtml)
    const scrapedAt = new Date(now()).toISOString()
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.detailUrl)
      const job = extractJobDetail(detailHtml, listing)

      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createInformationEvolutionScraper().run(options)

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
