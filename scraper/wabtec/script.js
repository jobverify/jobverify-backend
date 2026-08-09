import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_URL = 'https://careers.wabtec.com/in/jobs'
export const COMPANY = 'Wabtec Corporation'
export const SOURCE = 'wabtec'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripTags = (value) => String(value ?? '')
  .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, ' ')
  .replace(/<li\b[^>]*>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(stripTags(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toAbsoluteUrl = (value) => {
  try {
    return new URL(decodeHtmlEntities(value), CAREERS_URL).toString()
  } catch {
    return null
  }
}

const getCardStartIndexes = (html) => [...String(html ?? '').matchAll(/<div class="attrax-vacancy-tile\b/gi)]
  .map((match) => match.index)

const splitJobCards = (html) => {
  const pageHtml = String(html ?? '')
  const indexes = getCardStartIndexes(pageHtml)

  return indexes.map((start, index) => {
    const end = indexes[index + 1] ?? pageHtml.length
    return pageHtml.slice(start, end)
  })
}

const extractTitleAndUrl = (cardHtml) => {
  const match = /<a[^>]*class="[^"]*attrax-vacancy-tile__title[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(cardHtml)
  return {
    sourceUrl: toAbsoluteUrl(match?.[1]),
    title: normalizeWhitespace(match?.[2]),
  }
}

const extractLabeledValues = (cardHtml) => {
  const values = new Map()
  const pattern = /<p[^>]*class="[^"]*attrax-vacancy-tile__item-label[^"]*"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<p[^>]*class="[^"]*attrax-vacancy-tile__item-value[^"]*"[^>]*>([\s\S]*?)<\/p>/gi

  for (const match of cardHtml.matchAll(pattern)) {
    const label = normalizeWhitespace(match[1])?.toLowerCase()
    const value = normalizeWhitespace(match[2])

    if (!label || !value) continue

    const existing = values.get(label) ?? []
    existing.push(value)
    values.set(label, existing)
  }

  return values
}

const getFieldValues = (fields, ...labels) => labels.flatMap((label) => fields.get(label.toLowerCase()) ?? [])

const getFirstFieldValue = (fields, ...labels) => getFieldValues(fields, ...labels).find(Boolean) ?? null

const extractJobId = (cardHtml, sourceUrl) =>
  /data-jobid="(\d+)"/i.exec(cardHtml)?.[1]
  || /vacancyId=(\d+)/i.exec(cardHtml)?.[1]
  || /jid-(\d+)/i.exec(sourceUrl ?? '')?.[1]
  || null

const normalizeClosingDate = (value) => {
  const normalized = normalizeWhitespace(value)

  if (!normalized) return null
  if (/^(?:0?1\/0?1\/0{3}[01]|jan\s+1,\s+0{3}[01])$/i.test(normalized)) return null

  return normalized
}

const locationImpliesIndia = (value) => /\bindia\b/i.test(value ?? '')

const getNormalizedLocation = (fields, cardHtml, sourceUrl) => {
  const locationValues = getFieldValues(fields, 'location')
  const location = locationValues.find(locationImpliesIndia)
    || locationValues[0]
    || null

  if (!location) return null
  if (locationImpliesIndia(location)) return location
  if (/attrax-vacancy-tile--india\b/i.test(cardHtml) || /-india-jid-\d+/i.test(sourceUrl ?? '')) {
    return `${location}, India`
  }

  return location
}

const extractCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0])

const isIndiaCard = (cardHtml, location, sourceUrl) =>
  /attrax-vacancy-tile--india\b/i.test(cardHtml)
  || locationImpliesIndia(location)
  || /-india-jid-\d+/i.test(sourceUrl ?? '')

const hasOfficialSearchPageShape = (html) => /Wabtec/i.test(html)
  && /attrax-vacancy-tile/i.test(html)

const hasOfficialDetailPageShape = (html) => /Wabtec/i.test(html)
  && /(jobApplyBtn|\/Workflow\?workflowId=)/i.test(html)

const extractDescriptionWidgetHtml = (html) => {
  const pageHtml = String(html ?? '')
  const markerIndex = pageHtml.indexOf('description-widget')
  if (markerIndex === -1) return null

  const start = pageHtml.lastIndexOf('<div', markerIndex)
  const tail = pageHtml.slice(start === -1 ? markerIndex : start)
  const nextWidgetIndex = tail.indexOf('<div class="cop-widget dynamic-widget', 1)
  return nextWidgetIndex === -1 ? tail : tail.slice(0, nextWidgetIndex)
}

const extractSectionListItems = (html, marker) => {
  const match = new RegExp(`${marker}[\\s\\S]*?<ul[^>]*>([\\s\\S]*?)<\\/ul>`, 'i').exec(html)
  if (!match) return []

  return [...match[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((item) => normalizeWhitespace(item[1]))
    .filter(Boolean)
}

export const buildSearchPageUrl = (page = 1) => {
  const normalizedPage = Math.max(1, Number(page) || 1)
  return `${CAREERS_URL}?page=${normalizedPage}`
}

export const extractTotalPages = (html) => {
  const pageNumbers = [...String(html ?? '').matchAll(/pagination\((\d+)\)|(?:\?|&)page=(\d+)/gi)]
    .map((match) => Number.parseInt(match[1] || match[2], 10))
    .filter(Number.isFinite)

  if (!pageNumbers.length) {
    return splitJobCards(html).length ? 1 : 0
  }

  return Math.max(...pageNumbers)
}

export const extractSearchResults = (html) => splitJobCards(html)
  .map((cardHtml) => {
    const { title, sourceUrl } = extractTitleAndUrl(cardHtml)
    const fields = extractLabeledValues(cardHtml)
    const location = getNormalizedLocation(fields, cardHtml, sourceUrl)
    const jobId = extractJobId(cardHtml, sourceUrl)

    if (!isIndiaCard(cardHtml, location, sourceUrl)) return null
    if (!title || !sourceUrl || !location || !jobId) return null

    return {
      title,
      company: COMPANY,
      department: getFirstFieldValue(fields, 'department', 'job family'),
      location,
      city: extractCity(location),
      country: 'India',
      jobId,
      requisitionId: getFirstFieldValue(fields, 'reference', 'requisition id', 'req id') || jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: getFirstFieldValue(fields, 'job type', 'time type', 'type of contract', 'employment type'),
      experienceRequired: getFirstFieldValue(fields, 'experience level', 'experience'),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: normalizeClosingDate(getFirstFieldValue(fields, 'expiry date', 'closing date')),
      jobDescription: getFirstFieldValue(fields, 'description'),
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html, listing = {}) => {
  const requiredSkills = extractSectionListItems(html, 'jobad-qualifications')
  const descriptionWidgetHtml = extractDescriptionWidgetHtml(html)

  return {
    ...listing,
    applyUrl: toAbsoluteUrl(
      /<a[^>]*href="([^"]*\/Workflow\?workflowId=[^"]+)"/i.exec(html)?.[1]
        || /<a[^>]*class="[^"]*jobApplyBtn[^"]*"[^>]*href="([^"]+)"/i.exec(html)?.[1],
    ) || listing.applyUrl,
    minimumQualification: requiredSkills[0] || listing.minimumQualification || null,
    requiredSkills: requiredSkills.length ? requiredSkills : listing.requiredSkills || [],
    jobDescription: normalizeWhitespace(descriptionWidgetHtml) || listing.jobDescription || null,
  }
}

const defaultFetchText = async (url) => fetchTextWithRetry(url, {
  label: 'wabtec fetch',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
})

export const createWabtecScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchText = defaultFetchText,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run() {
    const firstPageHtml = await fetchText(buildSearchPageUrl(1))
    if (!hasOfficialSearchPageShape(firstPageHtml)) {
      throw new Error('Response is not the official Wabtec jobs page')
    }

    const totalPages = extractTotalPages(firstPageHtml)
    const pageLimit = Math.min(totalPages || 1, maxPages)
    const jobs = []
    const seenJobIds = new Set()

    for (let page = 1; page <= pageLimit; page += 1) {
      const pageHtml = page === 1
        ? firstPageHtml
        : await fetchText(buildSearchPageUrl(page))
      const listings = extractSearchResults(pageHtml)

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        let job = listing

        try {
          const detailHtml = await fetchText(listing.sourceUrl)
          if (hasOfficialDetailPageShape(detailHtml)) {
            job = extractJobDetail(detailHtml, listing)
          }
        } catch {
          job = listing
        }

        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }
    }

    return jobs
  },
})

export const run = async () => createWabtecScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Wabtec scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
