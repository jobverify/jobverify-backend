import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://ascinternational.com/careers/'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const htmlToText = (value) => String(value ?? '')
  .replace(/<br\b[^>]*>/gi, '\n')
  .replace(/<\/li>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<\/h[1-6]>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)
  .join('\n') || null

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const extractJobBlocks = (html) => [...String(html ?? '').matchAll(
  /<h4\b[^>]*>([\s\S]*?)<\/h4>([\s\S]*?)(?=<h4\b|<\/main>|<footer\b|$)/gi,
)]

const extractLocation = (value) => {
  const matches = [...String(value ?? '').matchAll(/([A-Za-z][A-Za-z .'-]+),\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?/g)]
  const lastMatch = matches.at(-1)
  if (!lastMatch) {
    return { location: null, city: null }
  }

  const city = normalizeWhitespace(lastMatch[1])
  const state = normalizeWhitespace(lastMatch[2])
  if (!city || !state) {
    return { location: null, city: null }
  }

  return {
    location: `${city}, ${state}, USA`,
    city,
  }
}

const extractRequirements = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      minimumQualification: null,
      experienceRequired: null,
    }
  }

  const match = normalized.match(/Requirements:\s*(.*?)\s+and\s+(\d+)\s+Years?[â€™']?\s+experience/i)
  if (!match) {
    return {
      minimumQualification: null,
      experienceRequired: null,
    }
  }

  return {
    minimumQualification: normalizeWhitespace(match[1]),
    experienceRequired: `${match[2]} years`,
  }
}

const extractRequiredSkills = (value) => {
  const match = String(value ?? '').match(/including:\s*<\/p>\s*<ul\b[^>]*>([\s\S]*?)<\/ul>/i)
  if (!match) return []

  return [...match[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((item) => normalizeWhitespace(item[1]))
    .filter((item) => item && !/^travel:/i.test(item))
}

export const buildSearchUrl = () => CAREER_PAGE_URL

export const extractSearchResults = (html) => extractJobBlocks(html)
  .map((match) => {
    const title = normalizeWhitespace(match[1])
    const blockHtml = match[2]
    const blockText = htmlToText(blockHtml)
    const jobId = slugify(title)
    const { location, city } = extractLocation(blockText)
    const { minimumQualification, experienceRequired } = extractRequirements(blockText)

    if (!title || !jobId) return null

    return {
      title,
      company: 'ASC International',
      department: null,
      location,
      city,
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREER_PAGE_URL,
      applyUrl: CAREER_PAGE_URL,
      employmentType: null,
      experienceRequired,
      minimumQualification,
      preferredQualification: null,
      requiredSkills: extractRequiredSkills(blockHtml),
      postingDate: null,
      closingDate: null,
      jobDescription: blockText,
    }
  })
  .filter(Boolean)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createAscInternationalScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const html = await fetchText(buildSearchUrl())
    const jobs = extractSearchResults(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'ascinternational',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createAscInternationalScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ASC International scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'ascinternational')
    console.log('DB result:', result)
    process.exit(0)
  }
}
