import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'betterplace'
export const COMPANY = 'BetterPlace'
export const VERIFIED_ON = '2026-07-30'
export const OFFICIAL_SITE_URL = 'https://www.betterplace.co.in/'
export const CAREERS_URL = 'https://aj.betterplace.co.in/careers/'
export const DISPOSITION = 'verified-first-party-careers-page-visible-cards'
export const VERIFIED_SURFACE_SUMMARY =
  "Verified on Thursday, July 30, 2026 that https://www.betterplace.co.in/ explicitly directed job seekers to BetterPlace's careers page at https://aj.betterplace.co.in/careers/, and that the public Betterplace Select careers page exposed 18 live visible job cards across Operations and Business Development & Sales with stable data-value slugs such as field-hr-executive-bangalore and staffing-manager-delhi. This scraper validates that verified public careers shell and returns the public India job cards from the official BetterPlace surface without inventing hidden detail data."

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const CAREERS_PAGE_PATTERNS = [
  /<title[^>]*>\s*We're Hiring \| Work with us - Careers at Betterplace Select\s*<\/title>/i,
  /\bstrictApiURI\s*=\s*['"]https:\/\/ajapi\.betterplace\.co\.in\/['"]/i,
  /\bCareers at Aasaanjobs\b/i,
  /\bOpen Positions\b/i,
  /\bBetterplace Select\b/i,
  /\bknow-more\b/i,
]

const decodeEntities = (value = '') =>
  String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&ensp;|&#8194;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeEntities(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value = '') =>
  normalizeWhitespace(
    decodeEntities(String(value))
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )

const toAnchorUrl = (slug) => {
  try {
    return new URL(`#${slug}`, CAREERS_URL).toString()
  } catch {
    return CAREERS_URL
  }
}

const extractCity = (location) => normalizeWhitespace(location)?.split(/\s*[,/]\s*/)[0] || null

const extractTabLabels = (html = '') => {
  const labels = new Map()

  for (const match of String(html).matchAll(
    /<a href="#([^"]+)"[^>]*aria-controls="([^"]+)"[^>]*data-toggle="tab"[^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const hrefId = normalizeWhitespace(match[1])
    const controlsId = normalizeWhitespace(match[2])
    const label = normalizeWhitespace(match[3])?.replace(/\s*\(\d+\)\s*$/, '') || null

    if (!hrefId || !controlsId || hrefId !== controlsId || !label) continue
    labels.set(hrefId, label)
  }

  return labels
}

const extractHeadingParts = (headingHtml = '') => {
  const location = stripTags(headingHtml.match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] || '')
  const title = stripTags(String(headingHtml).replace(/<span[\s\S]*?<\/span>/i, ' '))

  if (!title || !location) return null

  return { title, location }
}

export const extractJobCards = (html = '') => {
  const rawHtml = String(html ?? '')
  const tabLabels = extractTabLabels(rawHtml)
  const parts = rawHtml.split(/<div id="([^"]+)" role="tabpanel" class="tab-pane[^"]*">/i)
  const jobs = []

  for (let index = 1; index < parts.length; index += 2) {
    const paneId = normalizeWhitespace(parts[index])
    const department = paneId ? tabLabels.get(paneId) || null : null
    const paneRemainder = parts[index + 1] || ''
    const nextPaneStart = paneRemainder.search(/<div id="[^"]+" role="tabpanel" class="tab-pane/i)
    const paneHtml = nextPaneStart >= 0
      ? paneRemainder.slice(0, nextPaneStart)
      : paneRemainder

    for (const match of paneHtml.matchAll(
      /<section[^>]*\bjob-card\b[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>[\s\S]*?<p[^>]*\bellipsis-2-lines\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<a\b([^>]*)>\s*Know More\s*<\/a>/gi,
    )) {
      const heading = extractHeadingParts(match[1])
      const summary = stripTags(match[2])
      const anchorAttributes = match[3] || ''
      const slug = normalizeWhitespace(anchorAttributes.match(/\bdata-value="([^"]+)"/i)?.[1])
      const hasKnowMoreClass = /\bclass="[^"]*\bknow-more\b[^"]*"/i.test(anchorAttributes)

      if (!heading || !summary || !slug || !hasKnowMoreClass) continue

      jobs.push({
        department,
        title: heading.title,
        location: heading.location,
        summary,
        jobId: slug,
      })
    }
  }

  return jobs
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  if (!CAREERS_PAGE_PATTERNS.every((pattern) => pattern.test(page))) return false
  return extractJobCards(page).length > 0
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

export const createBetterPlaceScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('BetterPlace verified official careers page changed materially')
    }

    const cards = extractJobCards(careersHtml)
    if (cards.length === 0) {
      throw new Error('BetterPlace careers page no longer exposes the verified public job cards')
    }

    return cards.map((card) => {
      const sourceUrl = toAnchorUrl(card.jobId)

      return {
        title: card.title,
        company: COMPANY,
        department: card.department,
        location: card.location,
        city: extractCity(card.location),
        country: 'India',
        jobId: card.jobId,
        requisitionId: card.jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: card.summary,
        source: SOURCE,
        link: sourceUrl,
        scrapedAt: now(),
      }
    })
  },
})

export const run = async (options = {}) => createBetterPlaceScraper().run(options)

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
