import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.atnetindia.net/career/'

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
    .replace(/<br\s*\/?>/gi, '\n')
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

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toIndiaLocation = (city) => {
  const normalizedCity = normalizeWhitespace(city)
  if (!normalizedCity) return { location: 'India', city: null }

  return {
    location: `${normalizedCity}, India`,
    city: normalizedCity,
  }
}

const extractField = (text, pattern) => normalizeWhitespace(text.match(pattern)?.[1]) || null

const parseTitleAndLocation = (rawTitle) => {
  const normalized = normalizeWhitespace(rawTitle)
  if (!normalized) return { title: null, locationHint: null }

  const match = normalized.match(/^(.*?)\s*@\s*(.+)$/)
  if (!match) {
    return {
      title: normalized,
      locationHint: null,
    }
  }

  return {
    title: normalizeWhitespace(match[1]),
    locationHint: normalizeWhitespace(match[2]),
  }
}

const extractAccordionEntries = (html) => String(html ?? '')
  .split(/<div class="toggle default"[^>]*>/i)
  .slice(1)
  .map((section) => {
    const titleText = stripTags(
      section.match(/<h3>\s*<a[^>]*>[\s\S]*?<\/i>\s*([\s\S]*?)<\/a>\s*<\/h3>/i)?.[1],
    )
    const bodyHtml = section.match(/<div class="inner-toggle-wrap">([\s\S]*?)<\/div>\s*<\/div>\s*$/i)?.[1]
      || section.match(/<div class="inner-toggle-wrap">([\s\S]*?)<\/div>\s*<\/div>/i)?.[1]
      || ''
    const applyUrl = normalizeWhitespace(
      section.match(/<a[^>]+href="([^"]+)"[^>]*>\s*<span>\s*Apply Now\s*<\/span>/i)?.[1],
    )

    return {
      titleText,
      bodyHtml,
      applyUrl,
    }
  })
  .filter((entry) => entry.titleText && entry.applyUrl)

export const buildSearchUrl = () => CAREER_PAGE_URL

export const pageIndicatesJobsAccordion = (html) => (
  /class="toggles accordion"/i.test(String(html ?? ''))
  && /Apply Now/i.test(String(html ?? ''))
)

export const extractSearchResults = (html) => extractAccordionEntries(html)
  .map((entry) => {
    const bodyHtmlWithoutApply = String(entry.bodyHtml).replace(
      /<a[^>]*>\s*<span>\s*Apply Now\s*<\/span>\s*<\/a>/gi,
      '',
    )
    const detailsLines = stripTagsWithLineBreaks(bodyHtmlWithoutApply)
    const detailsText = normalizeWhitespace(detailsLines.replace(/\n/g, ' '))
    const { title, locationHint } = parseTitleAndLocation(entry.titleText)
    const detailLocation = extractField(detailsLines, /^(?:Job Location|Location)\s*:\s*(.+)$/im)
    const experience = extractField(detailsLines, /^Experience\s*:\s*(.+)$/im)
    const qualification = extractField(detailsLines, /^Educational Qualification\s*:\s*(.+)$/im)
    const chosenLocation = detailLocation || locationHint
    const { location, city } = toIndiaLocation(chosenLocation)

    if (!title) return null

    const jobId = `atvideonetworks-${slugify(title)}-${slugify(city || chosenLocation || 'india')}`
    const jobDescription = normalizeWhitespace(
      `${detailsText || 'Apply via the A&T Video Networks careers form.'} Apply via the A&T Video Networks careers form.`,
    )

    return {
      title,
      company: 'A&T Video Networks',
      department: title,
      location,
      city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREER_PAGE_URL,
      applyUrl: entry.applyUrl,
      employmentType: null,
      experienceRequired: experience,
      minimumQualification: qualification,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription,
    }
  })
  .filter(Boolean)
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

export const createATVideoNetworksScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const html = await fetchText(buildSearchUrl())

    if (!pageIndicatesJobsAccordion(html)) {
      throw new Error('A&T Video Networks careers page no longer exposes the expected jobs accordion')
    }

    const jobs = extractSearchResults(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'atvideonetworks',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createATVideoNetworksScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running A&T Video Networks scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'atvideonetworks')
    console.log('DB result:', result)
    process.exit(0)
  }
}
