import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://sagaciousresearch.com/current-openings'

const COMPANY = 'Sagacious Research'
const SOURCE = 'sagaciousresearch'

const normalizeText = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const slugify = (value) => normalizeText(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const normalizeLocation = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return null

  const withoutCountry = normalized.replace(/\s*\(\s*India\s*\)\s*$/i, '')
  return `${withoutCountry.replace(/\s*,\s*/g, ', ')}, India`
}

const extractCity = (location) => normalizeText(String(location ?? '').split(',')[0])

const normalizeExperience = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return null

  const withoutLabel = normalized.replace(/^Experience:\s*/i, '')
  const rangeMatch = withoutLabel.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*years?/i)
  if (rangeMatch) return `${rangeMatch[1]} - ${rangeMatch[2]} years`

  const plusMatch = withoutLabel.match(/(\d+(?:\.\d+)?)\+?\s*years?/i)
  if (plusMatch) return `${plusMatch[1]}+ years`

  return withoutLabel
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /WORK WITH US/i.test(page)
    && /We are looking for exceptional talent/i.test(page)
    && /careers@sagaciousresearch\.com/i.test(page)
    && /Apply Now/i.test(page)
}

const extractCardBlocks = (html) => {
  const page = String(html ?? '')
  const contentStart = page.search(/WORK WITH US/i)
  const relevantPage = contentStart >= 0 ? page.slice(contentStart) : page
  const applyAnchors = [...relevantPage.matchAll(
    /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/gi,
  )]

  return applyAnchors.map((anchor, index) => {
    const start = index === 0 ? 0 : (applyAnchors[index - 1].index ?? 0) + applyAnchors[index - 1][0].length
    return {
      html: relevantPage.slice(start, anchor.index),
      applyUrl: normalizeText(anchor[1]),
    }
  })
}

export const extractJobCards = (html) => extractCardBlocks(html)
  .map(({ html: cardHtml, applyUrl }) => {
    const headings = [...String(cardHtml ?? '').matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
      .map((match) => normalizeText(match[1]))
      .filter(Boolean)
    const paragraphs = [...String(cardHtml ?? '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => normalizeText(match[1]))
      .filter(Boolean)
    const listItems = [...String(cardHtml ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((match) => normalizeText(match[1]))
      .filter(Boolean)

    const title = headings.at(-1) || null
    const department = paragraphs.at(-1) || null

    if (!title || !department || listItems.length < 2 || !applyUrl) return null

    const location = normalizeLocation(listItems[0])
    const city = extractCity(location)

    if (!location || !city) return null

    return {
      title,
      company: COMPANY,
      department,
      location,
      city,
      country: 'India',
      jobId: `${SOURCE}-${slugify(title)}-${slugify(city)}`,
      requisitionId: null,
      sourceUrl: CAREERS_URL,
      applyUrl,
      employmentType: listItems[1] || null,
      experienceRequired: normalizeExperience(listItems[2]),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    }
  })
  .filter(Boolean)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createSagaciousResearchScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(html)) {
      throw new Error('Sagacious Research official careers surface changed; refusing to scrape')
    }

    return extractJobCards(html).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createSagaciousResearchScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Sagacious Research scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
