import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { MMC_INFOTECH_SERVICES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')

const stripTags = (value) => decodeHtmlEntities(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => stripTags(value)
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n+/g, '\n')
  .trim()

const normalizeText = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized || null
}

const slugify = (value) => normalizeText(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || null

const toAbsoluteUrl = (value) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value), CAREERS_URL).toString()
  } catch {
    return null
  }
}

const extractCity = (location) => normalizeText(String(location ?? '').split(',')[0])

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /Career\b/i.test(page)
    && /Join Our Family/i.test(text)
    && /Apply Now/i.test(text)
    && /form\.php\?job_posting=/i.test(page)
}

export const extractListingCards = (html = '') =>
  (() => {
    const page = String(html ?? '')
    const buildListing = ({
      title,
      applyHref,
      location = null,
      experience = null,
      description = null,
    }) => {
      const normalizedTitle = normalizeText(title)
      const sourceUrl = toAbsoluteUrl(applyHref)
      const jobId = slugify(normalizedTitle)

      if (!normalizedTitle || !sourceUrl || !jobId) return null

      const normalizedLocation = normalizeText(location)
      const normalizedExperience = normalizeText(experience)

      return {
        title: normalizedTitle,
        location: normalizedLocation ? `${normalizedLocation}, India` : 'India',
        city: extractCity(normalizedLocation),
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        experienceRequired: normalizedExperience,
        publicExperienceChecked: !normalizedExperience,
        jobDescription: normalizeText(description),
      }
    }

    const legacyCards = [...page.matchAll(
      /<div[^>]*class=["'][^"']*\bjob-card\b[^"']*["'][^>]*>([\s\S]*?<a[^>]*href=["'][^"']*form\.php\?job_posting=[^"']+["'][^>]*>\s*Apply Now\s*<\/a>[\s\S]*?)<\/div>/gi,
    )]
      .map((match) => {
        const cardHtml = match[1]
        return buildListing({
          title: cardHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] ?? null,
          applyHref:
            cardHtml.match(/<a[^>]*href=["']([^"']*form\.php\?job_posting=[^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i)?.[1]
            ?? null,
          location:
            cardHtml.match(/<p[^>]*class=["'][^"']*\bjob-location\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]
            ?? null,
          experience:
            cardHtml.match(/<p[^>]*class=["'][^"']*\bjob-experience\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]
            ?? null,
          description:
            cardHtml.match(/<div[^>]*class=["'][^"']*\bjob-description\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
            ?? null,
        })
      })
      .filter(Boolean)

    const tabCards = [...page.matchAll(
      /<ul[^>]*class=["'][^"']*\btabs\b[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']#["'][^>]*>[\s\S]*?(?:<div[^>]*>[\s\S]*?<\/div>)?\s*([^<]+?)\s*<\/a>[\s\S]*?<\/ul>[\s\S]*?<div[^>]*class=["'][^"']*products-details-tab-content[^"']*["'][^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<a[^>]*href=["']([^"']*form\.php\?job_posting=[^"']+)["'][^>]*>[\s\S]*?Apply Now[\s\S]*?<\/a>/gi,
    )]
      .map((match) => buildListing({
        title: match[1],
        applyHref: match[3],
        description: match[2],
      }))
      .filter(Boolean)

    return [...new Map([...legacyCards, ...tabCards].map((card) => [card.jobId, card])).values()]
  })()

export const createMmcInfotechServicesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(html)) {
      throw new Error('MMC Infotech Services verified careers page no longer matches the trusted first-party surface')
    }

    const jobs = extractListingCards(html)
    if (jobs.length === 0) {
      throw new Error('MMC Infotech Services verified careers page no longer exposes inline job openings')
    }

    return jobs.map((job) => ({
      title: job.title,
      company: COMPANY,
      department: null,
      location: job.location,
      city: job.city,
      country: 'India',
      jobId: job.jobId,
      requisitionId: job.requisitionId,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      employmentType: null,
      experienceRequired: job.experienceRequired,
      publicExperienceChecked: job.publicExperienceChecked,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: job.jobDescription,
      source: SOURCE,
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createMmcInfotechServicesScraper(options).run()

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
