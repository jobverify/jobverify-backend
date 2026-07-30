import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../shared/browserFetch.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'bharatfinancialinclusionlimited'
export const COMPANY = 'Bharat Financial Inclusion Limited'
export const CAREERS_URL = 'https://www.bfil.co.in/apply-for-job.php'
export const APPLICATION_EMAIL = 'careers@bfil.co.in'
export const APPLICATION_URL =
  'mailto:careers@bfil.co.in?subject=%5BVertical%20Name%5D%20%2F%20%5BPreferred%20Location%5D%20%2F%20%5BRole%5D'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const getApplyInstructions = (html) => {
  const page = String(html ?? '')
  const subjectFormat = stripTags(
    page.match(/\[Vertical Name\][\s\S]*?\[Role\]/i)?.[0] || '[Vertical Name] / [Preferred Location] / [Role]',
  )
  const example = stripTags(
    page.match(/Example:\s*([^<]+)/i)?.[0] || 'Example: BSS / Mysore / Loan Officer',
  )

  return `Apply with subject format: ${subjectFormat}. ${example}.`
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /APPLY FOR A JOB/i.test(page)
    && /Bharat Financial Inclusion Limited|Current Opportunities at BFIL/i.test(page)
    && /How to Apply/i.test(page)
    && /\[Vertical Name\]\s*\/\s*\[Preferred Location\]\s*\/\s*\[Role\]/i.test(page)
    && /careers@bfil\.co\.in/i.test(page)
}

export const extractRoleListings = (html) => {
  const jobs = []
  const applyInstructions = getApplyInstructions(html)

  for (const match of String(html ?? '').matchAll(
    /<h5[^>]*>([\s\S]*?)<\/h5>\s*(?:<p[^>]*>[\s\S]*?<\/p>\s*)?<ul>([\s\S]*?)<\/ul>/gi,
  )) {
    const department = stripTags(match[1])
    const listHtml = match[2]

    if (!department) continue

    for (const itemMatch of listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const title = stripTags(itemMatch[1])
      if (!title) continue

      const jobId = slugify(`${department} ${title}`)

      jobs.push({
        title,
        company: COMPANY,
        department,
        location: null,
        city: null,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: CAREERS_URL,
        applyUrl: APPLICATION_URL,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: applyInstructions,
      })
    }
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|406|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const createBharatFinancialInclusionLimitedScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    const fetchPageText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    try {
      const careersHtml = await fetchPageText(CAREERS_URL)

      if (!hasOfficialCareersSignal(careersHtml)) {
        throw new Error('BFIL careers page no longer matches the verified first-party email-apply surface')
      }

      return extractRoleListings(careersHtml).map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      }))
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createBharatFinancialInclusionLimitedScraper().run(options)

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
