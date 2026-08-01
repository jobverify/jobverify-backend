import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { AKULAKU_CATALOG, VERIFIED_SURFACE_SUMMARY } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = AKULAKU_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const FIRST_PARTY_CAREERS_URL = PROVIDER_METADATA.firstPartyCareersUrl
export const OFFICIAL_JOBS_BOARD_URL = PROVIDER_METADATA.officialJobsBoardUrl
export const JOB_LISTINGS_URL = PROVIDER_METADATA.jobListingsUrl
export const VERIFIED_SURFACE_SUMMARY_TEXT = VERIFIED_SURFACE_SUMMARY

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .trim()

const normalizeUrl = (value) => {
  try {
    return new URL(String(value ?? '')).href
  } catch {
    return String(value ?? '').trim()
  }
}

const buildAbsoluteUrl = (value, baseUrl = OFFICIAL_JOBS_BOARD_URL) => {
  try {
    return new URL(String(value ?? ''), baseUrl).href
  } catch {
    return String(value ?? '').trim()
  }
}

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1]) || null
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const extractOfficialJobsBoardUrl = (html = '') => {
  const match = String(html ?? '').match(
    /<a[^>]+href=["'](https:\/\/akulaku\.zhiye\.com\/[^"']*)["'][^>]*>[\s\S]*?<\/a>/i,
  )

  return match?.[1] ? normalizeUrl(match[1]) : null
}

export const hasFirstPartyCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return extractTitle(rawHtml) === 'Karir - Akulaku'
    && normalized.includes('Bergabung Bersama Akulaku')
    && normalized.includes('Lihat Lowongan')
    && extractOfficialJobsBoardUrl(rawHtml) === OFFICIAL_JOBS_BOARD_URL
}

export const hasOfficialJobsBoardSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /招聘系统/i.test(extractTitle(rawHtml) || '')
    && /alljob\/\?o=1/i.test(rawHtml)
    && (/beisen/i.test(normalized) || /beisen\.com/i.test(rawHtml))
}

export const hasJobListingsPageSignal = (html = '') =>
  /全部职位/i.test(extractTitle(html) || '')
  && hasOfficialJobsBoardSignal(html)

const extractDetailId = (detailUrl) => {
  const match = String(detailUrl ?? '').match(/\/zpdetail\/(\d+)/i)
  return match?.[1] || null
}

const extractRequisitionId = (title = '') => {
  const match = String(title ?? '').match(/[（(](J\d+)[)）]\s*$/i)
  return match?.[1]?.toUpperCase() || null
}

export const extractJobCards = (html = '') => (
  [...String(html ?? '').matchAll(
    /<tr>\s*<td>\s*<a title="([^"]+)" href="([^"]+)"[^>]*>[^<]+<\/a>\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td title="([^"]*)">([^<]*)<\/td>\s*<td>([^<]*)<\/td>/gi,
  )]
    .map((match) => {
      const detailUrl = buildAbsoluteUrl(match[2], OFFICIAL_JOBS_BOARD_URL)
      return {
        title: decodeHtmlEntities(match[1]),
        detailUrl,
        detailId: extractDetailId(detailUrl),
        requisitionId: extractRequisitionId(match[1]),
        location: decodeHtmlEntities(match[4] || match[5]),
        postingDate: decodeHtmlEntities(match[6]),
      }
    })
)

export const extractNextPageUrl = (html = '', currentUrl = JOB_LISTINGS_URL) => {
  const match = String(html ?? '').match(
    /<a href=['"]([^'"]*alljob\/\?o=1[^'"]*)['"][^>]*>[\s\S]*?下一页[\s\S]*?<\/a>/i,
  )

  if (!match?.[1]) return null
  return buildAbsoluteUrl(match[1], currentUrl)
}

export const isIndiaLocation = (location = '') => {
  const rawLocation = String(location ?? '')
  const normalized = normalizeWhitespace(rawLocation).toLowerCase()

  if (!normalized) return false
  if (normalized.includes('indonesia') || rawLocation.includes('印度尼西亚')) return false

  const englishSignals = [
    'india',
    'bengaluru',
    'bangalore',
    'gurgaon',
    'gurugram',
    'hyderabad',
    'mumbai',
    'pune',
    'delhi',
    'new delhi',
    'noida',
    'chennai',
    'kolkata',
    'ahmedabad',
    'jaipur',
    'coimbatore',
  ]
  if (englishSignals.some((signal) => normalized.includes(signal))) return true

  const chineseSignals = [
    '印度',
    '班加罗尔',
    '班加羅爾',
    '孟买',
    '孟買',
    '新德里',
    '海得拉巴',
    '钦奈',
    '浦那',
    '古尔冈',
    '古爾岡',
    '古尔格拉姆',
    '诺伊达',
    '加尔各答',
    '艾哈迈达巴德',
  ]

  return chineseSignals.some((signal) => rawLocation.includes(signal))
}

const cleanJobTitle = (title = '') =>
  decodeHtmlEntities(title).replace(/\s*[（(]J\d+[)）]\s*$/i, '').trim()

const extractCityFromLocation = (location = '') => {
  const normalized = normalizeWhitespace(location)

  if (!isIndiaLocation(normalized)) return null
  if (/国外-印度/.test(normalized)) return null

  const parts = normalized.split(/[-/|,]/).map((item) => item.trim()).filter(Boolean)
  if (parts.length >= 2 && /india|印度/i.test(parts[0])) {
    return parts[1]
  }

  const titleCaseSignals = [
    'Bengaluru',
    'Bangalore',
    'Gurgaon',
    'Gurugram',
    'Hyderabad',
    'Mumbai',
    'Pune',
    'Delhi',
    'Noida',
    'Chennai',
    'Kolkata',
    'Ahmedabad',
    'Jaipur',
    'Coimbatore',
  ]

  const matchedCity = titleCaseSignals.find((signal) => normalized.toLowerCase().includes(signal.toLowerCase()))
  return matchedCity || null
}

const extractLabeledField = (text, label) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(text ?? '').match(new RegExp(`${escapedLabel}[：:]\\s*([^:：]+?)(?=\\s+[\\u4e00-\\u9fffA-Za-z]+[：:]|$)`))
  return match?.[1]?.trim() || null
}

export const extractJobDescription = (html = '') => {
  const text = normalizeWhitespace(html)
  const responsibilities = extractLabeledField(text, '工作职责')
  const qualifications = extractLabeledField(text, '任职资格')

  if (responsibilities && qualifications) {
    return `工作职责：${responsibilities} 任职资格：${qualifications}`
  }

  if (responsibilities) {
    return `工作职责：${responsibilities}`
  }

  if (qualifications) {
    return `任职资格：${qualifications}`
  }

  return null
}

const extractPostingDateFromDetail = (html = '') => {
  const text = normalizeWhitespace(html)
  return extractLabeledField(text, '发布时间')
}

const hasJobDetailSignal = (html = '') => {
  const title = extractTitle(html) || ''
  const text = normalizeWhitespace(html)
  return /招聘详细/i.test(title)
    && /工作地点/.test(text)
    && /发布时间/.test(text)
}

const mapListingToJob = (listing, detailHtml, now) => ({
  title: cleanJobTitle(listing.title),
  company: COMPANY,
  department: null,
  location: listing.location,
  city: extractCityFromLocation(listing.location),
  country: 'India',
  jobId: listing.detailId,
  requisitionId: listing.requisitionId,
  sourceUrl: listing.detailUrl,
  applyUrl: listing.detailUrl,
  employmentType: null,
  experienceRequired: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: extractPostingDateFromDetail(detailHtml) || listing.postingDate || null,
  closingDate: null,
  jobDescription: extractJobDescription(detailHtml),
  source: SOURCE,
  link: listing.detailUrl,
  scrapedAt: now(),
})

export const createAkulakuScraper = ({
  now = () => new Date().toISOString(),
  maxPages = 50,
} = {}) => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(FIRST_PARTY_CAREERS_URL)

    if (Number(careersPage.status) !== 200 || !hasFirstPartyCareersSignal(careersPage.html)) {
      throw new Error('Akulaku verified first-party careers shell no longer matches the public surface')
    }

    const boardHomePage = await fetchPage(OFFICIAL_JOBS_BOARD_URL)

    if (Number(boardHomePage.status) !== 200 || !hasOfficialJobsBoardSignal(boardHomePage.html)) {
      throw new Error('Akulaku verified official jobs board no longer matches the public surface')
    }

    const collectedCards = []
    const seenPageUrls = new Set()
    let nextPageUrl = JOB_LISTINGS_URL

    while (nextPageUrl && !seenPageUrls.has(nextPageUrl)) {
      if (seenPageUrls.size >= maxPages) {
        throw new Error('Akulaku listing pagination exceeded the verified safety limit')
      }

      const listingPage = await fetchPage(nextPageUrl)

      if (Number(listingPage.status) !== 200 || !hasJobListingsPageSignal(listingPage.html)) {
        throw new Error(`Akulaku listing page surface changed: ${nextPageUrl}`)
      }

      const pageCards = extractJobCards(listingPage.html)
      if (pageCards.length === 0) {
        throw new Error(`Akulaku listing page surface changed: ${nextPageUrl}`)
      }

      collectedCards.push(...pageCards)
      seenPageUrls.add(nextPageUrl)
      nextPageUrl = extractNextPageUrl(listingPage.html, nextPageUrl)
    }

    const uniqueCards = [...new Map(
      collectedCards.map((card) => [card.detailUrl, card]),
    ).values()]
    const indiaCards = uniqueCards.filter((card) => isIndiaLocation(card.location))
    const jobs = []

    for (const listing of indiaCards) {
      const detailPage = await fetchPage(listing.detailUrl)

      if (Number(detailPage.status) !== 200 || !hasJobDetailSignal(detailPage.html)) {
        throw new Error(`Akulaku detail page surface changed: ${listing.detailUrl}`)
      }

      jobs.push(mapListingToJob(listing, detailPage.html, now))
    }

    return jobs
  },
})

export const run = async (options = {}) => createAkulakuScraper().run(options)

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
