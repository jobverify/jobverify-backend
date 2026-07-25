import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import BEBO_TECHNOLOGIES_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = BEBO_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const APPLY_HOST = PROVIDER_METADATA.officialApplyHost

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/&ndash;|&#8211;/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const isOfficialApplyUrl = (value) => {
  try {
    const url = new URL(value)
    return url.hostname === 'bebotechnologiesin.mobile-recruit.com'
  } catch {
    return false
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title[^>]*>\s*Build Your Career in Software Testing and QA With bebo\s*<\/title>/i.test(page)
    && text.includes('Our Chandigarh, India team does great work and enjoys doing it.')
    && /Apply Now/i.test(text)
}

export const extractJobs = (html = '') => {
  const jobs = []
  const page = String(html ?? '')

  for (const match of page.matchAll(
    /<h5[^>]*>([\s\S]*?)<\/h5>([\s\S]*?)<a[^>]*href=["'](https:\/\/bebotechnologiesin\.mobile-recruit\.com\/m\/[^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/gi,
  )) {
    const title = normalizeWhitespace(match[1])
    const block = match[2]
    const applyUrl = match[3]
    const experienceRequired = normalizeWhitespace(
      block.match(/(\d+\s*-\s*\d+\s*Years?)/i)?.[1],
    ) || null
    const jobDescription = stripTags(block).replace(/\b\d+\s*-\s*\d+\s*Years?\b/i, '').trim() || null

    if (!title || !isOfficialApplyUrl(applyUrl)) continue

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: 'Chandigarh, India',
      city: 'Chandigarh',
      country: 'India',
      jobId: applyUrl.split('/m/')[1]?.split('?')[0] || title,
      requisitionId: applyUrl.split('/m/')[1]?.split('?')[0] || title,
      sourceUrl: applyUrl,
      applyUrl,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription,
      remoteStatus: null,
    })
  }

  return jobs
}

export const createBeboTechnologiesScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('bebo Technologies verified first-party careers surface no longer matches the trusted page')
    }

    return extractJobs(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createBeboTechnologiesScraper().run(options)

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
