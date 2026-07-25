import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { TECHTREE_IT_SYSTEMS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
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

export const extractJobCards = (html = '') => {
  const page = String(html ?? '')
  const cards = []

  for (const match of page.matchAll(/<div class="awsm-job-listing-item awsm-list-item"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi)) {
    const cardHtml = match[0]
    const sourceUrl = toAbsoluteUrl(cardHtml.match(/<a href="([^"]+)"[^>]*>\s*[^<]+/i)?.[1])
    const title = stripTags(cardHtml.match(/<h2 class="awsm-job-post-title">([\s\S]*?)<\/h2>/i)?.[1])
    const employmentType = extractSpecificationTerms(cardHtml, 'job-type')[0] || null
    const locations = extractSpecificationTerms(cardHtml, 'job-location')

    if (!sourceUrl || !title || locations.length === 0) continue

    cards.push({
      title,
      employmentType,
      locations,
      location: formatLocation(locations),
      city: locations[0],
      sourceUrl,
      applyUrl: sourceUrl,
    })
  }

  return cards
}

export const createTechtreeItSystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Techtree It Systems verified careers page changed materially')
    }

    const cards = extractJobCards(careersHtml)
    if (cards.length === 0) {
      throw new Error('Techtree It Systems careers page no longer exposes trusted inline wp-job-openings cards')
    }

    return cards.map((card) => ({
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
    }))
  },
})

export const run = async (options = {}) => createTechtreeItSystemsScraper(options).run(options)

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
