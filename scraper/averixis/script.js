import path from 'path'
import vm from 'node:vm'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://averixis.com/career'
export const CONTACT_PAGE_URL = 'https://averixis.com/contact'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;/gi, "'")
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return 'India'
  return /india/i.test(normalized) ? normalized : `${normalized}, India`
}

const extractCity = (value) => normalizeWhitespace(String(value ?? '').split(',')[0]) || null

export const pageIndicatesCareerShell = (html) => {
  const rawHtml = String(html ?? '')
  const title = normalizeWhitespace((rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1])

  return /averixis/i.test(rawHtml)
    && /assets\/index-[^"']+\.js/i.test(rawHtml)
    && (
      /linkedin\.com\/company\/averixis-solutions/i.test(rawHtml)
      || /^Averixis Solutions$/i.test(title || '')
    )
}

export const extractBundleUrl = (html) => {
  const match = String(html ?? '').match(
    /<script[^>]+src=["']([^"']*assets\/index-[^"']+\.js)["']/i,
  )
  if (!match) return null

  return new URL(match[1], `${new URL(CAREER_PAGE_URL).origin}/`).toString()
}

export const bundleIndicatesCareerContent = (bundle) => {
  const normalized = normalizeWhitespace(bundle)?.toLowerCase() || ''

  return (
    extractOpenings(bundle).length > 0
    && normalized.includes('averixis solutions')
    && (
      normalized.includes('https://averixis.com/contact')
      || /(?:to|href):["']\/contact["']/i.test(String(bundle ?? ''))
    )
    && (
      normalized.includes('const openings=')
      || normalized.includes('current openings')
      || normalized.includes('search job titles')
    )
  )
}

const extractArrayLiteral = (source, pattern) => {
  const rawSource = String(source ?? '')
  const match = rawSource.match(pattern)
  if (!match) return null

  const startIndex = rawSource.indexOf('[', match.index)
  if (startIndex === -1) return null

  let depth = 0
  let quote = null
  let escaped = false

  for (let index = startIndex; index < rawSource.length; index += 1) {
    const character = rawSource[index]

    if (quote) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === quote) {
        quote = null
      }
      continue
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character
      continue
    }

    if (character === '[') {
      depth += 1
      continue
    }

    if (character === ']') {
      depth -= 1
      if (depth === 0) {
        return rawSource.slice(startIndex, index + 1)
      }
    }
  }

  return null
}

const parseArrayLiteral = (literal) => {
  if (!literal) return []

  try {
    const value = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 })
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const extractOpenings = (bundle) => {
  const patterns = [
    /\b(?:const|let|var)\s+openings\s*=\s*\[/i,
    /\beb\s*=\s*\[/i,
  ]

  for (const pattern of patterns) {
    const openings = parseArrayLiteral(extractArrayLiteral(bundle, pattern))
    if (
      openings.some((opening) =>
        opening && typeof opening === 'object' && normalizeWhitespace(opening.title),
      )
    ) {
      return Array.from(openings)
    }
  }

  return []
}

export const extractJobsFromBundle = (bundle) => extractOpenings(bundle)
  .map((opening) => {
    const title = normalizeWhitespace(opening?.title)
    const slug = slugify(title)
    if (!title || !slug) return null

    const city = extractCity(opening?.location)

    return {
      title,
      company: 'Averixis Solutions',
      department: null,
      location: normalizeLocation(opening?.location),
      city,
      country: 'India',
      jobId: `averixis-${slug}`,
      requisitionId: `averixis-${slug}`,
      sourceUrl: CAREER_PAGE_URL,
      applyUrl: CONTACT_PAGE_URL,
      employmentType: normalizeWhitespace(opening?.type),
      experienceRequired: normalizeWhitespace(opening?.experience),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: normalizeWhitespace(opening?.description),
    }
  })
  .filter(Boolean)
  .sort((left, right) => left.title.localeCompare(right.title))

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

export const createAverixisScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const nowValue = options.now || now

    const html = await fetchText(CAREER_PAGE_URL)
    if (!pageIndicatesCareerShell(html)) {
      throw new Error('Averixis careers page no longer exposes the expected bundle shell')
    }

    const bundleUrl = extractBundleUrl(html)
    if (!bundleUrl) {
      throw new Error('Averixis careers page no longer exposes the expected bundle URL')
    }

    const bundle = await fetchText(bundleUrl)
    if (!bundleIndicatesCareerContent(bundle)) {
      throw new Error('Averixis careers bundle no longer exposes the expected openings content')
    }

    const jobs = extractJobsFromBundle(bundle)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'averixis',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: nowValue(),
    }))
  },
})

export const run = async () => createAverixisScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Averixis scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'averixis')
    console.log('DB result:', result)
    process.exit(0)
  }
}
