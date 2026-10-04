import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { THINKBRIDGE_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&middot;/gi, '·')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return CAREERS_URL
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const total = Number.parseInt(normalizeWhitespace(page).match(/\b(\d+) open roles\b/i)?.[1], 10)

  return /<title>\s*Careers at thinkbridge \| Remote-first engineering work\s*<\/title>/i.test(page)
    && Number.isInteger(total)
    && total > 0
    && extractJobCards(page).length === total
}

export const extractJobCards = (html = '') => {
  const jobs = []
  for (const match of String(html ?? '').matchAll(/<li\b[^>]*data-loc="([^"]+)"[^>]*>\s*<a class="role" href="([^"]+)">\s*<span class="role-t">([\s\S]*?)<\/span>\s*<span class="role-m">([\s\S]*?)<\/span>/gi)) {
    const [, mode, href, titleHtml, metadataHtml] = match
    const title = normalizeText(titleHtml)
    const sourceUrl = toAbsoluteUrl(href)
    const metadata = normalizeWhitespace(metadataHtml).split(/\s*·\s*/)
    const location = normalizeText(metadata[0])
    const country = /\bIndia\b/i.test(location || '') ? 'India' : null
    if (!title || !location || !/^https:\/\/www\.thinkbridge\.com\/careers\/[^/?#]+$/.test(sourceUrl)) continue
    const requisitionId = sourceUrl.split('/').pop()

    jobs.push({
      title,
      jobId: `${SOURCE}-${requisitionId}`,
      requisitionId,
      sourceUrl,
      applyUrl: sourceUrl,
      location,
      city: null,
      country,
      department: null,
      employmentType: normalizeText(metadata[1]),
      workplaceType: /^remote$/i.test(mode) ? 'Remote' : 'On-site',
      experienceRequired: normalizeText(metadata[2]),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      compensation: null,
      postingDate: null,
      closingDate: null,
      openingsCount: null,
      jobDescription: null,
      companyCareerPage: CAREERS_URL,
    })
  }

  return jobs
}

export const extractVerifiedDetail = (html, card) => {
  const page = String(html ?? '')
  const title = normalizeText(page.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1])
  const canonical = page.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1]
  const applyUrl = page.match(/<a\b[^>]*href="(https:\/\/careers\.thinkbridge\.com\/jobs\/Careers\/[^"?#]+(?:\?[^\"]*)?)"[^>]*>\s*Apply for this role/i)?.[1]
  if (title !== card.title
    || canonical !== card.sourceUrl
    || !applyUrl
    || !new RegExp(`<title>\\s*${card.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} job \\| thinkbridge\\s*<\\/title>`, 'i').test(page)) {
    throw new Error(`thinkbridge job detail page changed materially: ${card.sourceUrl}`)
  }

  return {
    applyUrl,
    jobDescription: normalizeText(page.match(/<meta\b[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1]),
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createThinkbridgeScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('thinkbridge verified first-party job-search page changed materially')
    }

    const jobs = extractJobCards(careersHtml)
    if (jobs.length === 0) {
      throw new Error('thinkbridge verified first-party job-search page no longer exposes visible public role cards')
    }

    const detailedJobs = []
    for (const job of jobs) {
      const detail = extractVerifiedDetail(await fetchText(job.sourceUrl), job)
      detailedJobs.push({
        ...job,
        ...detail,
        company: COMPANY,
        source: SOURCE,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
        link: detail.applyUrl,
        scrapedAt: (overrideNow || now)(),
      })
    }
    return detailedJobs
  },
})

export const run = async (options = {}) => createThinkbridgeScraper().run(options)

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
