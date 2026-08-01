import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SPRINGWORKS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SPRINGWORKS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const ABOUT_URL = PROVIDER_METADATA.aboutUrl
export const HANDOFF_URL = PROVIDER_METADATA.handoffUrl
export const JOBS_URL = PROVIDER_METADATA.jobsUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1]) || null
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const sameUrl = (left, right) => String(left ?? '').replace(/\/$/, '') === String(right ?? '').replace(/\/$/, '')

const stripTags = (value = '') => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

export const hasFirstPartyAboutSignal = (html = '') => {
  const normalized = stripTags(html).toLowerCase()
  const title = (extractTitle(html) || '').toLowerCase()

  return title.includes('springworks')
    && normalized.includes('join our team')
    && normalized.includes('work with us')
    && String(html ?? '').includes(HANDOFF_URL)
}

export const hasGoodfitJobsSignal = (html = '') => {
  const normalized = stripTags(html).toLowerCase()
  return normalized.includes('springworks')
    && normalized.includes('remote')
    && /\/jobs\/springworks\//i.test(String(html ?? ''))
}

export const extractSpringworksJobs = (html = '') => {
  const cards = []
  const seen = new Set()
  const pattern = /<a[^>]+href="(\/jobs\/springworks\/[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const relativeUrl = match[1]
    const sourceUrl = new URL(relativeUrl, 'https://app.goodfit.so').toString()
    if (seen.has(sourceUrl)) continue
    seen.add(sourceUrl)

    const title = normalizeWhitespace(decodeHtmlEntities(match[2]))
    const locationText = normalizeWhitespace(decodeHtmlEntities(match[3]))
    if (!title || !locationText) continue

    const [brand = null, location = null, employmentType = null] = locationText
      .split(/[✦•|]/)
      .map((part) => normalizeWhitespace(part))

    cards.push({
      title,
      company: brand || COMPANY,
      department: null,
      location: location || locationText,
      city: null,
      country: /india/i.test(locationText) ? 'India' : null,
      jobId: sourceUrl.split('id=').pop() || relativeUrl,
      requisitionId: sourceUrl.split('id=').pop() || relativeUrl,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    })
  }

  return cards
}

export const createSpringworksScraper = () => ({
  async run({ fetchPage = defaultFetchPage, now = () => new Date().toISOString() } = {}) {
    const aboutPage = await fetchPage(ABOUT_URL)
    if (
      aboutPage.status !== 200
      || !sameUrl(aboutPage.url, ABOUT_URL)
      || !hasFirstPartyAboutSignal(aboutPage.html)
    ) {
      throw new Error('Springworks first-party about page no longer matches the trusted careers handoff surface')
    }

    const jobsPage = await fetchPage(JOBS_URL)
    if (
      jobsPage.status !== 200
      || !sameUrl(jobsPage.url, JOBS_URL)
      || !hasGoodfitJobsSignal(jobsPage.html)
    ) {
      throw new Error('Springworks Goodfit jobs page no longer matches the verified SSR jobs surface')
    }

    const jobs = extractSpringworksJobs(jobsPage.html)
    if (jobs.length === 0) {
      throw new Error('Springworks verified jobs page no longer exposes trusted public role cards')
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createSpringworksScraper().run(options)

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
