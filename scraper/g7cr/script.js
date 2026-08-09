import path from 'path'
import { fileURLToPath } from 'url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { isIndiaJob as isIndiaJobInScope } from '../../scraper-support/utils/indiaLocationFilter.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_URL = 'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-listings/'
export const CAREERS_SITEMAP_URL = 'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/careers-sitemap.xml'
export const COMPANY = 'G7 CR Technologies'
export const SOURCE = 'g7cr'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const DETAIL_URL_REGEX = /^https:\/\/g7cr-site-dev-update-12-12-25\.azurewebsites\.net\/job-details\/([a-z0-9-]+)\/$/i

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeSlugToken = (value) => normalizeWhitespace(String(value ?? '').replace(/-/g, ' '))

const toTitleCase = (value) => normalizeWhitespace(value)
  ?.split(' ')
  .filter(Boolean)
  .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
  .join(' ')
  || null

const buildLocation = (cityToken, countryToken) => {
  const rawCity = toTitleCase(decodeSlugToken(cityToken))
  const city = normalizeCity(rawCity)
  const country = toTitleCase(decodeSlugToken(countryToken))
  if (!rawCity || !city || !country) return { city: null, country: null, location: null }

  return {
    city,
    country,
    location: `${rawCity}, ${country}`,
  }
}

const parseSlug = (slug) => {
  const parts = String(slug ?? '').split('-').filter(Boolean)
  if (parts.length < 3) return null

  const countryToken = parts.at(-1)
  const cityToken = parts.at(-2)
  const titleTokens = parts.slice(0, -2)
  const title = toTitleCase(titleTokens.join(' '))
  const { city, country, location } = buildLocation(cityToken, countryToken)

  if (!title || !city || !country || !location) return null

  return {
    title,
    city,
    country,
    location,
  }
}

const extractUrlEntries = (xml) => Array.from(
  String(xml ?? '').matchAll(/<url>\s*<loc>([\s\S]*?)<\/loc>(?:\s*<lastmod>([\s\S]*?)<\/lastmod>)?[\s\S]*?<\/url>/gi),
).map((match) => ({
  url: normalizeWhitespace(match[1]),
  lastmod: normalizeWhitespace(match[2]) || null,
}))

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /g7\s*cr/i.test(page)
    && /job listings/i.test(page)
    && /https:\/\/g7cr-site-dev-update-12-12-25\.azurewebsites\.net\/job-listings\/?/i.test(page)
}

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

export const extractJobsFromSitemap = (xml) => {
  const jobs = []
  const seenJobIds = new Set()

  for (const entry of extractUrlEntries(xml)) {
    const sourceUrl = entry.url
    const slug = normalizeWhitespace(sourceUrl?.match(DETAIL_URL_REGEX)?.[1])
    if (!sourceUrl || !slug || seenJobIds.has(slug)) continue

    const parsed = parseSlug(slug)
    if (!parsed) continue

    const job = {
      title: parsed.title,
      company: COMPANY,
      department: null,
      location: parsed.location,
      city: parsed.city,
      country: parsed.country,
      jobId: slug,
      requisitionId: slug,
      sourceUrl,
      applyUrl: `${sourceUrl}#career_detail`,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: entry.lastmod,
      closingDate: null,
      jobDescription: null,
    }

    if (!isIndiaJobInScope(job)) continue

    seenJobIds.add(slug)
    jobs.push(job)
  }

  return jobs
}

export const createG7CrScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Response is not the verified official G7 CR careers page')
    }

    const sitemapXml = await fetchText(CAREERS_SITEMAP_URL)
    const jobs = extractJobsFromSitemap(sitemapXml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createG7CrScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running G7 CR scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
