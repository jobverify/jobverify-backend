import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { INFINITI_SOFTWARE_SOLUTIONS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = INFINITI_SOFTWARE_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_LOCATION_PATTERN = /\b(?:chennai|mumbai|india)\b/i
const shouldUseBrowserFallback = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const getParagraphs = (block) => [...String(block ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  .map((item) => normalizeWhitespace(item[1]))
  .filter(Boolean)

const toAbsoluteUrl = (value) => {
  try {
    const url = new URL(value, CAREERS_URL)
    if (!url.hostname.endsWith('goodfit.so')) return null
    if (!/\/(?:apply|jobs)\//i.test(url.pathname)) return null
    return url.toString()
  } catch {
    return null
  }
}

const extractJobId = (url) => {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).pop() || null
  } catch {
    return null
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  attempts: 1,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)
  return /<title[^>]*>\s*Travel Tech Jobs\s*(?:&amp;|&)\s*Careers at Infiniti Software Solutions\s*<\/title>/i.test(page)
    && normalized.includes('Explore Job Opportunities')
    && /goodfit\.so\/apply/i.test(page)
}

export const extractJobs = (html = '') => {
  const jobs = []
  const seen = new Set()

  for (const match of String(html ?? '').matchAll(
    /<a[^>]*href=["']([^"']*goodfit\.so[^"']+)["'][^>]*>\s*[\s\S]*?Apply[\s\S]*?<\/a>/gi,
  )) {
    const applyUrl = toAbsoluteUrl(match[1])
    const jobId = extractJobId(applyUrl)
    if (!applyUrl || !jobId || seen.has(jobId)) continue

    const localBlock = String(html ?? '').slice(Math.max(0, (match.index || 0) - 8000), (match.index || 0) + match[0].length)
    const titleMatches = [...localBlock.matchAll(/<h2[^>]*class=["'][^"']*elementor-heading-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/gi)]
    const paragraphMatches = [...localBlock.matchAll(/<p>([\s\S]*?)<\/p>/gi)]
    const iconValueMatches = [...localBlock.matchAll(
      /<div[^>]*class=["'][^"']*elementor-icon-box-title[^"']*["'][^>]*>\s*<span>\s*([^<]+)\s*<\/span>\s*<\/div>/gi,
    )]
    const title = normalizeWhitespace(titleMatches.at(-1)?.[1])
    const jobDescription = normalizeWhitespace(paragraphMatches.at(-1)?.[1])
    const iconValues = iconValueMatches.map((item) => normalizeWhitespace(item[1])).filter(Boolean)
    const experienceRequired = iconValues.at(-2) || null
    const city = iconValues.at(-1) || null

    if (!title || !city || !applyUrl || !jobId || !INDIA_LOCATION_PATTERN.test(city)) continue
    seen.add(jobId)

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: `${city}, India`,
      city,
      country: 'India',
      jobId,
      requisitionId: jobId,
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
      remoteStatus: 'On-site',
    })
  }

  return jobs
}

export const createInfinitiSoftwareSolutionsScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText, fetchBrowserJobs } = {}) {
    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent: USER_AGENT,
      })

      try {
        const page = await context.newPage()
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })

        if (!response || !response.ok()) {
          const status = response?.status() ?? 'NO_RESPONSE'
          throw new Error(`HTTP ${status} for ${url}`)
        }

        await page.waitForTimeout(3000)
        return await page.content()
      } finally {
        await context.close().catch(() => {})
        await browser.close().catch(() => {})
      }
    })

    const browserJobsFetcher = fetchBrowserJobs || (async (url) => {
      const browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent: USER_AGENT,
      })

      try {
        const page = await context.newPage()
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })

        if (!response || !response.ok()) {
          const status = response?.status() ?? 'NO_RESPONSE'
          throw new Error(`HTTP ${status} for ${url}`)
        }

        await page.waitForTimeout(3000)
        return await page.evaluate(() => Array.from(
          document.querySelectorAll('a[href*="goodfit.so/apply"], a[href*="v2.app.goodfit.so/jobs/"]'),
        ).map((anchor) => {
          const card = anchor.closest('[data-element_type="container"]') || anchor.closest('.e-con') || anchor.parentElement
          const iconValues = Array.from(card?.querySelectorAll('.elementor-icon-box-title span') || [])
            .map((element) => element.textContent?.trim())
            .filter(Boolean)

          return {
            title: card?.querySelector('h2')?.textContent?.trim() || null,
            jobDescription: card?.querySelector('p')?.textContent?.trim() || null,
            experienceRequired: iconValues[0] || null,
            city: iconValues[1] || null,
            applyUrl: anchor.href || null,
          }
        }))
      } finally {
        await context.close().catch(() => {})
        await browser.close().catch(() => {})
      }
    })

    const fetchTextWithBrowserFallback = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!shouldUseBrowserFallback(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    const html = await fetchTextWithBrowserFallback(CAREERS_URL)
    if (!hasOfficialCareersSignal(html)) {
      throw new Error('The verified Infiniti Software Solutions careers surface no longer matches the trusted first-party page')
    }

    let jobs = extractJobs(html)
    if (jobs.length === 0) {
      const browserJobs = await browserJobsFetcher(CAREERS_URL)
      jobs = browserJobs
        .map((job) => {
          const applyUrl = toAbsoluteUrl(job.applyUrl)
          const title = normalizeWhitespace(job.title)
          const city = normalizeWhitespace(job.city)
          const jobId = extractJobId(applyUrl)

          if (!title || !city || !applyUrl || !jobId || !INDIA_LOCATION_PATTERN.test(city)) {
            return null
          }

          return {
            title,
            company: COMPANY,
            department: null,
            location: `${city}, India`,
            city,
            country: 'India',
            jobId,
            requisitionId: jobId,
            sourceUrl: applyUrl,
            applyUrl,
            employmentType: null,
            experienceRequired: normalizeWhitespace(job.experienceRequired),
            minimumQualification: null,
            preferredQualification: null,
            requiredSkills: [],
            postingDate: null,
            closingDate: null,
            jobDescription: normalizeWhitespace(job.jobDescription),
            remoteStatus: 'On-site',
          }
        })
        .filter(Boolean)
    }

    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createInfinitiSoftwareSolutionsScraper().run(options)

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
