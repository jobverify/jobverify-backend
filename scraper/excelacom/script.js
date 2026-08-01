import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const RSS_FEED_URL = 'https://phg.tbe.taleo.net/phg02/ats/servlet/Rss?org=EXCELACOM&cws=38&WebPage=SRCHR_V2&WebVersion=0&_rss_version=2'

const COMPANY_NAME = 'Excelacom'
const SOURCE = 'excelacom'
const FEED_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  Accept: 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
}

const COUNTRY_CODES = {
  IN: 'India',
  US: 'United States',
}

const INDIA_STATE_CODES = {
  AN: 'Andaman and Nicobar Islands',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CG: 'Chhattisgarh',
  CH: 'Chandigarh',
  DD: 'Daman and Diu',
  DL: 'Delhi',
  DN: 'Dadra and Nagar Haveli',
  GA: 'Goa',
  GJ: 'Gujarat',
  HP: 'Himachal Pradesh',
  HR: 'Haryana',
  JH: 'Jharkhand',
  JK: 'Jammu and Kashmir',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MH: 'Maharashtra',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MP: 'Madhya Pradesh',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  OR: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TG: 'Telangana',
  TN: 'Tamil Nadu',
  TR: 'Tripura',
  TS: 'Telangana',
  UK: 'Uttarakhand',
  UP: 'Uttar Pradesh',
  WB: 'West Bengal',
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: FEED_HEADERS,
  label: 'excelacom feed',
})

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&#8230;|&hellip;/gi, '...')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractTagValue = (tagName, value) => {
  const match = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i').exec(String(value ?? ''))
  return match ? match[1] : null
}

const extractItemBlocks = (xml) => [...String(xml ?? '').matchAll(/<item>([\s\S]*?)<\/item>/gi)]
  .map((match) => match[1])

const normalizeUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    url.hash = ''
    return url.toString()
  } catch {
    return normalized
  }
}

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString()
}

const getCountryCode = (block) => {
  const rawCountry = normalizeWhitespace(extractTagValue('taleo:locationCountry', block))
  if (rawCountry) return rawCountry.toUpperCase()

  const rawStateCode = normalizeWhitespace(extractTagValue('taleo:locationState', block))
  if (/^[A-Z]{2}-[A-Z]{2,3}$/i.test(rawStateCode || '')) {
    return rawStateCode.slice(0, 2).toUpperCase()
  }

  return null
}

const getState = (block, countryCode) => {
  const state = normalizeWhitespace(extractTagValue('taleo:location', block))
  if (state) return state

  const rawStateCode = normalizeWhitespace(extractTagValue('taleo:locationState', block))
  if (!rawStateCode) return null

  const code = rawStateCode.split('-').at(-1)?.toUpperCase() || null
  if (!code) return rawStateCode

  if (countryCode === 'IN') return INDIA_STATE_CODES[code] || code

  return code
}

const buildLocation = ({ city, state, country }) => {
  const parts = []
  for (const part of [city, state, country]) {
    if (part && parts[parts.length - 1] !== part) parts.push(part)
  }
  return parts.join(', ') || null
}

export const isIndiaJob = (job) => {
  const haystack = [
    job?.country,
    job?.state,
    job?.location,
    job?.city,
  ].filter(Boolean).join(' ')

  return /(^|[\s,(])india($|[\s,).])/i.test(haystack)
}

const parseFeedItem = (block) => {
  const title = normalizeWhitespace(extractTagValue('title', block))
  const applyUrl = normalizeUrl(extractTagValue('link', block) || extractTagValue('guid', block))
  const requisitionId = normalizeWhitespace(
    extractTagValue('taleo:reqId', block)
      || new URL(applyUrl || RSS_FEED_URL).searchParams.get('rid'),
  )

  if (!title || !applyUrl || !requisitionId) return null

  const countryCode = getCountryCode(block)
  const country = COUNTRY_CODES[countryCode] || normalizeWhitespace(extractTagValue('taleo:locationCountry', block))
  const city = normalizeWhitespace(extractTagValue('taleo:locationCity', block))
  const state = getState(block, countryCode)
  const description = stripTags(
    extractTagValue('taleo:html-description', block) || extractTagValue('description', block),
  )

  return {
    title,
    company: COMPANY_NAME,
    department: normalizeWhitespace(extractTagValue('taleo:department', block)),
    location: buildLocation({ city, state, country }),
    city,
    state,
    country,
    jobId: requisitionId,
    requisitionId,
    sourceUrl: applyUrl,
    applyUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeDate(extractTagValue('pubDate', block)),
    closingDate: null,
    jobDescription: description,
  }
}

export const extractJobsFromFeed = (xml) => extractItemBlocks(xml)
  .map((block) => parseFeedItem(block))
  .filter(Boolean)

export const filterIndiaJobs = (jobs) => jobs.filter((job) => isIndiaJob(job))

const normalizeScrapedAt = (value) => {
  if (value instanceof Date) return value.toISOString()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid now() value supplied to Excelacom scraper')
  }

  return parsed.toISOString()
}

export const createExcelacomScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date(),
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const limit = Number.isInteger(options.maxJobs) ? options.maxJobs : maxJobs
    const listings = filterIndiaJobs(extractJobsFromFeed(await fetchText(RSS_FEED_URL)))
    const selected = limit ? listings.slice(0, limit) : listings
    const scrapedAt = normalizeScrapedAt((options.now || now)())

    return selected.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createExcelacomScraper().run(options)
