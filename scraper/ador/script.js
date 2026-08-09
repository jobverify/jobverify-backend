import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://adorwelding.com/careers/'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/[–—]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const stripTagsWithLineBreaks = (value) => {
  const normalized = String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/[–—]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n+/g, '\n')

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.join('\n')
}

const extractField = (text, pattern) => normalizeWhitespace(text.match(pattern)?.[1]) || null

const formatLocation = (locationText) => {
  const normalized = normalizeWhitespace(locationText)
  if (!normalized) {
    return {
      location: 'India',
      city: null,
    }
  }

  const hasMultipleLocations = normalized.includes(' / ')

  return {
    location: `${normalized}, India`,
    city: hasMultipleLocations ? null : normalized,
  }
}

const extractJobCards = (html) => String(html ?? '')
  .split(/<div class="job-item\b[^>]*>/i)
  .slice(1)
  .map((section) => {
    const title = stripTags(section.match(/<h5 class="job-title[^"]*"[^>]*>([\s\S]*?)<\/h5>/i)?.[1])
    const locationHint = stripTags(section.match(/<p class="my-1">([\s\S]*?)<\/p>/i)?.[1])
    const applyUrl = normalizeWhitespace(
      section.match(/<a[^>]+href="([^"]+job_id=\d+[^"]*)"[^>]*>\s*Apply Now\s*<\/a>/i)?.[1],
    )
    const detailMatch = section.match(
      /<div id="job-details-(\d+)" class="collapse mt-3 job-details"[\s\S]*?>([\s\S]*?)<\/div>/i,
    )

    return {
      title,
      locationHint,
      applyUrl,
      requisitionId: detailMatch?.[1] || null,
      detailHtml: detailMatch?.[2] || '',
    }
  })
  .filter((entry) => entry.title && entry.applyUrl && entry.requisitionId)

export const buildSearchUrl = () => CAREER_PAGE_URL

export const pageIndicatesJobCards = (html) => (
  /id="viewjob"/i.test(String(html ?? ''))
  && /class="job-item\b/i.test(String(html ?? ''))
  && /Apply Now/i.test(String(html ?? ''))
)

export const extractSearchResults = (html) => extractJobCards(html)
  .map((entry) => {
    const detailHtmlWithoutApply = String(entry.detailHtml).replace(
      /<a[^>]*>\s*Apply Now\s*<\/a>/gi,
      '',
    )
    const detailsLines = stripTagsWithLineBreaks(detailHtmlWithoutApply)
    const detailsText = normalizeWhitespace(detailsLines.replace(/\n/g, ' '))
    const locationText = extractField(detailsLines, /^Location\s*:\s*(.+)$/im) || entry.locationHint
    const experienceRequired = extractField(detailsLines, /^Years of experience\s*:\s*(.+)$/im)
    const minimumQualification = extractField(detailsLines, /^Qualification\s*:\s*(.+)$/im)
    const { location, city } = formatLocation(locationText)

    return {
      title: entry.title,
      company: 'ADOR',
      department: entry.title,
      location,
      city,
      country: 'India',
      jobId: `ador-${entry.requisitionId}`,
      requisitionId: entry.requisitionId,
      sourceUrl: CAREER_PAGE_URL,
      applyUrl: entry.applyUrl,
      employmentType: null,
      experienceRequired,
      minimumQualification,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: normalizeWhitespace(
        `${detailsText || 'Apply via the ADOR careers page.'} Apply via the ADOR careers page.`,
      ),
    }
  })
  .sort((left, right) => (
    left.title.localeCompare(right.title)
    || left.location.localeCompare(right.location)
  ))

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createAdorScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const html = await fetchText(buildSearchUrl())

    if (!pageIndicatesJobCards(html)) {
      throw new Error('ADOR careers page no longer exposes the expected job cards')
    }

    const jobs = extractSearchResults(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'ador',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createAdorScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ADOR scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'ador')
    console.log('DB result:', result)
    process.exit(0)
  }
}
