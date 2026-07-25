import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { V2SOFT_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = V2SOFT_CATALOG
export const SOURCE = V2SOFT_CATALOG.source
export const COMPANY = V2SOFT_CATALOG.companyName
export const CAREERS_URL = V2SOFT_CATALOG.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&#x27;|&apos;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeLocation = (value) => {
  const cleaned = normalizeWhitespace(value)
  return cleaned && /india/i.test(cleaned) ? cleaned : `${cleaned}, India`
}

const slugCity = (location) => normalizeWhitespace(location).split(',')[0] || null

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /Explore Career Possibility in India/i.test(page)
    && /RESTART YOUR CAREER AT V2SOFT!/i.test(text)
    && /JOB OPENINGS/i.test(text)
    && /View Job/i.test(text)
}

export const extractJobCards = (html = '') => {
  const cards = []
  const pattern = /<article[^>]*class="job-card"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<p[^>]*>([^<]+)<\/p>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>\s*View Job\s*<\/a>[\s\S]*?<\/article>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const title = normalizeWhitespace(match[1])
    const location = normalizeWhitespace(match[2])
    const detailUrl = normalizeWhitespace(match[3])

    if (!title || !location || !detailUrl) continue
    cards.push({ title, location, detailUrl })
  }

  return cards
}

const extractFieldAfterLabel = (html, label) => {
  const match = String(html ?? '').match(new RegExp(`${label}\\s*:?\\s*<\\/[^>]+>\\s*<p[^>]*>([\\s\\S]*?)<\\/p>`, 'i'))
  if (match) return normalizeWhitespace(match[1])

  const fallback = String(html ?? '').match(new RegExp(`${label}\\s*:?\\s*([^<\\n]+)`, 'i'))
  return normalizeWhitespace(fallback?.[1] ?? '')
}

const extractListItems = (html) =>
  Array.from(String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)

const extractJobDetails = (html = '', { fallbackTitle, fallbackLocation, detailUrl } = {}) => {
  const page = String(html ?? '')
  const title = normalizeWhitespace(page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || fallbackTitle
  const jobId = normalizeWhitespace(page.match(/Job#\s*:\s*([A-Z0-9-]+)/i)?.[1])
  const location = normalizeWhitespace(page.match(/Location\s*:\s*([^<\n]+)/i)?.[1]) || fallbackLocation
  const employmentType = extractFieldAfterLabel(page, 'Job Type')
  const experienceRequired = extractFieldAfterLabel(page, 'Experience Required')
  const qualification = extractFieldAfterLabel(page, 'Qualification')
  const skills = extractFieldAfterLabel(page, 'Skills Required')
  const descriptionList = extractListItems(page)

  return {
    title,
    location: normalizeLocation(location),
    jobId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: employmentType || null,
    experienceRequired: experienceRequired || null,
    minimumQualification: qualification || null,
    requiredSkills: skills
      ? skills.split(',').map((skill) => normalizeWhitespace(skill)).filter(Boolean)
      : [],
    jobDescription: descriptionList.join(' '),
  }
}

export const createV2softScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const listingHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(listingHtml)) {
      throw new Error('V2soft careers page no longer matches the verified first-party surface')
    }

    const cards = extractJobCards(listingHtml)
    if (cards.length === 0) {
      throw new Error('V2soft careers listing no longer exposes first-party job cards')
    }

    const jobs = []
    for (const card of cards) {
      const detailHtml = await fetchText(card.detailUrl)
      const detail = extractJobDetails(detailHtml, card)
      if (!detail.title || !detail.jobId || !detail.jobDescription) {
        throw new Error(`V2soft detail page no longer matches the verified contract for ${card.detailUrl}`)
      }

      jobs.push({
        title: detail.title,
        company: COMPANY,
        department: null,
        location: detail.location,
        city: slugCity(detail.location),
        state: 'KA',
        country: 'India',
        jobId: detail.jobId,
        requisitionId: detail.jobId,
        sourceUrl: detail.sourceUrl,
        applyUrl: detail.applyUrl,
        employmentType: detail.employmentType,
        experienceRequired: detail.experienceRequired,
        minimumQualification: detail.minimumQualification,
        preferredQualification: null,
        requiredSkills: detail.requiredSkills,
        postingDate: null,
        closingDate: null,
        jobDescription: detail.jobDescription,
        source: SOURCE,
        link: detail.applyUrl,
        scrapedAt: now(),
        companyCareerPage: CAREERS_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createV2softScraper().run(options)

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
