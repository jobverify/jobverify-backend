import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'quantboxresearch'
export const COMPANY = 'Quantbox Research'
export const CAREERS_URL = 'https://www.quantboxresearch.com/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;/gi, "'")
  .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&ndash;|&#8211;|&#x2013;/gi, '-')
  .replace(/&mdash;|&#8212;|&#x2014;/gi, '-')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[â€â€“â€”]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const buildJobUrl = (value) => new URL(String(value ?? ''), CAREERS_URL).toString()

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalizeCity(normalized.split(',')[0] || normalized)
}

const isIndiaLocation = (location) => /\bIndia\b/i.test(String(location ?? ''))

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractSections = (html) => [...String(html ?? '').matchAll(
  /<span class="panel-title">([\s\S]*?)<\/span>[\s\S]*?<div class="panel-body[^"]*">([\s\S]*?)<\/div>/gi,
)]
  .map((match) => ({
    title: normalizeWhitespace(match[1]),
    text: stripTags(match[2]),
    items: extractListItems(match[2]),
  }))
  .filter((section) => section.title && section.text)

const buildJobDescription = (summary, sections) => normalizeWhitespace([
  summary,
  ...sections.map((section) => `${section.title} ${section.text}`),
].filter(Boolean).join(' '))

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title[^>]*>\s*Quantbox Research\s*<\/title>/i.test(page)
    && /<link[^>]+rel="canonical"[^>]+href="https:\/\/www\.quantboxresearch\.com\/"/i.test(page)
    && /class="s123-page-header[^"]*">\s*Jobs\s*<\/h2>/i.test(page)
    && /data-module-type="jobs"|class="s123-module[^"]*s123-module-jobs"/i.test(page)
}

export const extractJobCards = (html) => [...String(html ?? '').matchAll(
  /<div class="job-item[\s\S]*?<a class="jobsApplyBtn btn btn-primary"[\s\S]*?>\s*Apply Now\s*<\/a>\s*<\/div>/gi,
)]
  .map((match) => {
    const cardHtml = match[0]
    const titleMatch = cardHtml.match(/<h4 class="job-title">\s*<a href="([^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>\s*<\/h4>/i)
    const subtitleValues = [...cardHtml.matchAll(/<span class="section_small_text">([\s\S]*?)<\/span>/gi)]
      .map((subtitleMatch) => normalizeWhitespace(subtitleMatch[1]))
      .filter(Boolean)
    const summary = stripTags(
      cardHtml.match(/<div class="responsive-handler[^"]*main-description-text">([\s\S]*?)<\/div>/i)?.[1] || null,
    )
    const sections = extractSections(cardHtml)
    const requirements = sections.find((section) => /requirements/i.test(section.title))
    const href = titleMatch?.[1] || null
    const title = normalizeWhitespace(titleMatch?.[2] || null)
    const location = subtitleValues[0] || null
    const requisitionId = subtitleValues[1] || null

    if (!href || !title || !location || !requisitionId) return null

    const sourceUrl = buildJobUrl(href)

    return {
      title,
      company: COMPANY,
      department: null,
      location,
      city: extractCity(location),
      country: isIndiaLocation(location) ? 'India' : location,
      jobId: requisitionId,
      requisitionId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: requirements?.items || [],
      postingDate: null,
      closingDate: null,
      jobDescription: buildJobDescription(summary, sections),
      remoteStatus: 'On-site',
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createQuantboxResearchScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(homepageHtml)) {
      throw new Error('Quantbox Research homepage no longer matches the verified first-party public jobs surface')
    }

    const jobs = extractJobCards(homepageHtml)
    if (jobs.length === 0) {
      throw new Error('Quantbox Research homepage no longer exposes the verified public job cards')
    }

    return jobs
      .filter((job) => isIndiaLocation(job.location))
      .map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      }))
  },
})

export const run = async (options = {}) => createQuantboxResearchScraper().run(options)

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
