import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.algouniversity.com/careers/'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toAbsoluteUrl = (value) => {
  if (!value) return null
  return new URL(value, CAREER_PAGE_URL).toString()
}

const toIsoDate = (value) => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const inferRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote')) return 'Remote'
  return 'On-site'
}

const extractJsonLdJobPostings = (html) => {
  const postings = []

  for (const match of String(html ?? '').matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1])
      const items = Array.isArray(parsed) ? parsed : [parsed]

      for (const item of items) {
        if (item?.['@type'] === 'JobPosting') {
          postings.push(item)
        }
      }
    } catch {
      // Ignore unrelated structured data blocks.
    }
  }

  return postings
}

export const extractJobCards = (html) => {
  const cards = []
  const pattern = /<div class="job-card" data-department="([^"]+)"[\s\S]*?<h3 class="job-card__title">([\s\S]*?)<\/h3>[\s\S]*?<div class="job-card__tags">([\s\S]*?)<\/div>[\s\S]*?<p class="job-card__desc">([\s\S]*?)<\/p>[\s\S]*?<a href="([^"]+)" class="job-card__apply"/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const tags = [...match[3].matchAll(/<span class="job-card__tag[^"]*">([\s\S]*?)<\/span>/gi)]
      .map((tagMatch) => normalizeWhitespace(tagMatch[1]))
      .filter(Boolean)

    cards.push({
      department: normalizeWhitespace(match[1])?.toLowerCase() || null,
      title: normalizeWhitespace(match[2]),
      tags,
      summary: normalizeWhitespace(match[4]),
      href: normalizeWhitespace(match[5]),
    })
  }

  return cards
}

const groupJobPostingsByTitle = (postings) => {
  const grouped = new Map()

  for (const posting of postings) {
    const title = normalizeWhitespace(posting?.title)
    if (!title) continue

    const existing = grouped.get(title) || []
    existing.push(posting)
    grouped.set(title, existing)
  }

  return grouped
}

const readJobPostingLocation = (posting = {}) =>
  normalizeWhitespace(
    posting?.jobLocation?.address?.addressLocality
    || posting?.applicantLocationRequirements?.[0]?.name,
  )

const readJobPostingCountry = (posting = {}) =>
  normalizeWhitespace(
    posting?.jobLocation?.address?.addressCountry
    || posting?.applicantLocationRequirements?.[0]?.address?.addressCountry,
  )

const formatLocation = (locality, countryCode) => {
  const normalizedLocality = normalizeWhitespace(locality)
  const normalizedCountry = normalizeWhitespace(countryCode)?.toUpperCase()

  if (!normalizedLocality) return normalizedCountry === 'IN' ? 'India' : null
  if (normalizedCountry === 'IN' && !/india/i.test(normalizedLocality)) {
    return `${normalizedLocality}, India`
  }

  return normalizedLocality
}

const extractRoleId = (href) => {
  const url = new URL(toAbsoluteUrl(href))
  return url.searchParams.get('role') || null
}

export const buildSearchUrl = () => CAREER_PAGE_URL

export const extractSearchResults = (html) => {
  const cards = extractJobCards(html)
  const postingsByTitle = groupJobPostingsByTitle(extractJsonLdJobPostings(html))

  return cards.map((card) => {
    const posting = (postingsByTitle.get(card.title) || []).shift() || {}
    const roleId = extractRoleId(card.href)
    const locationLocality = readJobPostingLocation(posting) || card.tags[1] || null
    const location = formatLocation(locationLocality, readJobPostingCountry(posting))
    const remoteStatus = inferRemoteStatus(location || card.tags[1])
    const city = remoteStatus === 'Remote'
      ? null
      : normalizeWhitespace(locationLocality)?.split(',')[0]?.trim() || null
    const absoluteUrl = toAbsoluteUrl(card.href)

    return {
      title: card.title,
      company: 'AlgoUniversity',
      department: card.department,
      location,
      city,
      country: 'India',
      jobId: roleId,
      requisitionId: roleId,
      sourceUrl: absoluteUrl,
      applyUrl: absoluteUrl,
      employmentType: normalizeWhitespace(posting.employmentType) || card.tags[2] || null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: toIsoDate(posting.datePosted),
      closingDate: null,
      jobDescription: normalizeWhitespace(posting.description) || card.summary,
      remoteStatus,
    }
  }).filter((job) => job.title && job.jobId)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'algouniversity',
  timeoutMs: 15000,
})

export const createAlgoUniversityScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const html = await fetchText(buildSearchUrl())
    const jobs = extractSearchResults(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'algouniversity',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createAlgoUniversityScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running AlgoUniversity scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'algouniversity')
    console.log('DB result:', result)
    process.exit(0)
  }
}
