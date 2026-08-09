import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'vehanttechnologies'
export const COMPANY = 'Vehant Technologies'
export const CAREERS_URL = 'https://www.vehant.com/careers/'
export const AJAX_URL = 'https://www.vehant.com/wp-admin/admin-ajax.php'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#8211;|&#8212;/gi, '-')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value)
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtml(value)
    .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/section)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|ul|ol|h[1-6]|section)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const deriveJobIdFromUrl = (value) => {
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean)
    return slugify(segments.at(-1))
  } catch {
    return slugify(value)
  }
}

const deriveCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  return normalized
    .split(/,|&|\/|\|/)
    .map((part) => normalizeWhitespace(part))
    .find(Boolean) || normalized
}

export const hasOfficialCareersSurface = (html) => {
  const page = String(html ?? '')

  return /Submit\s+Your\s+Resume\s*-\s*recruitment@vehant\.com/i.test(page)
    && /<h2>\s*Job\s+Listing\s*<\/h2>/i.test(page)
    && (/Vehant\s+Technologies/i.test(page) || /job-listing-inner/i.test(page))
}

export const extractListingCards = (html) => {
  const cards = []
  const page = String(html ?? '')

  for (const match of page.matchAll(/<div class="job-box">([\s\S]*?)<\/div>\s*<\/div>/gi)) {
    const cardHtml = match[1]
    const title = stripTags(cardHtml.match(/<h4>([\s\S]*?)<\/h4>/i)?.[1])
    const rawLocation = stripTags(cardHtml.match(/<h6>([\s\S]*?)<\/h6>/i)?.[1])
    const sourceUrl = normalizeWhitespace(cardHtml.match(/<a[^>]*href="([^"]+)"/i)?.[1])
    const location = normalizeWhitespace(rawLocation?.replace(/^Location:\s*/i, ''))

    if (!title || !location || !sourceUrl) continue

    cards.push({
      title,
      location,
      sourceUrl,
    })
  }

  return cards
}

const extractJobSections = (html) => {
  const sections = []
  const page = String(html ?? '')

  for (const match of page.matchAll(/<div class="job">\s*<h5>\s*([\s\S]*?)\s*<\/h5>\s*([\s\S]*?)<\/div>/gi)) {
    const heading = stripTags(match[1])
    const body = stripTags(match[2])
    if (!heading || !body) continue
    sections.push({ heading, body })
  }

  return sections
}

export const extractJobDetail = (html) => {
  const page = String(html ?? '')
  const location = normalizeWhitespace(
    stripTags(page.match(/Location:\s*([^<]+)/i)?.[1]),
  )
  const experienceRequired = normalizeWhitespace(
    stripTags(page.match(/Years\s+of\s+Experience:\s*([^<]+)/i)?.[1]),
  )
  const sections = extractJobSections(page)
  const minimumQualification = sections.find((section) => /^Qualification$/i.test(section.heading))?.body || null
  const descriptionParts = sections.map((section) => `${section.heading} ${section.body}`)

  if (/Apply\s+For\s+This\s*<span>\s*Job\s*<\/span>/i.test(page) || /Apply\s+For\s+This\s+Job/i.test(page)) {
    descriptionParts.push('Apply For This Job')
  }

  return {
    location: location || null,
    experienceRequired: experienceRequired || null,
    minimumQualification,
    jobDescription: normalizeWhitespace(descriptionParts.join(' ')),
  }
}

export const buildAjaxRequestBody = ({ page, catId = '', searchTerm = '' } = {}) =>
  new URLSearchParams({
    action: 'load_more',
    page: String(page),
    cat_id: String(catId),
    search_term: String(searchTerm),
  }).toString()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: 'POST',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/javascript,*/*;q=0.01',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Origin: 'https://www.vehant.com',
    Referer: CAREERS_URL,
  },
  label: SOURCE,
  timeoutMs: 15000,
  ...options,
})

const mergeListings = (listings) => {
  const deduped = []
  const seen = new Set()

  for (const listing of listings) {
    const key = listing.sourceUrl || `${listing.title}|${listing.location}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(listing)
  }

  return deduped
}

export const createVehantTechnologiesScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSurface(careersHtml)) {
      throw new Error('Vehant careers page no longer matches the verified official public careers surface')
    }

    const allListings = [...extractListingCards(careersHtml)]
    let page = 2

    while (true) {
      const payload = await fetchJson(AJAX_URL, {
        body: buildAjaxRequestBody({ page }),
      })

      if (!payload?.success) break

      const html = String(payload.data ?? '')
      if (!html.trim()) break

      const cards = extractListingCards(html)
      if (cards.length === 0) break

      allListings.push(...cards)
      page += 1
    }

    const selectedListings = maxJobs
      ? mergeListings(allListings).slice(0, maxJobs)
      : mergeListings(allListings)

    const jobs = []

    for (const listing of selectedListings) {
      const detail = extractJobDetail(await fetchText(listing.sourceUrl))
      const jobId = deriveJobIdFromUrl(listing.sourceUrl)

      jobs.push({
        title: listing.title,
        company: COMPANY,
        location: detail.location || listing.location,
        city: deriveCity(detail.location || listing.location),
        country: 'India',
        source: SOURCE,
        jobId,
        requisitionId: jobId,
        sourceUrl: listing.sourceUrl,
        applyUrl: listing.sourceUrl,
        link: listing.sourceUrl,
        employmentType: null,
        experienceRequired: detail.experienceRequired,
        minimumQualification: detail.minimumQualification,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: detail.jobDescription,
        remoteStatus: 'On-site',
        scrapedAt: new Date().toISOString(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createVehantTechnologiesScraper().run(options)

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
