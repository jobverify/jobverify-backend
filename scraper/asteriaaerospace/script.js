import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../shared/browserFetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'asteriaaerospace'
export const COMPANY = 'Asteria Aerospace'
export const CAREERS_URL = 'https://asteria.co.in/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bopen roles\b/i,
  /\bjob openings\b/i,
  /\bapply now\b/i,
  /\bview jobs\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /darwinbox/i,
  /linkedin\.com\/jobs/i,
  /href=["'][^"']*(?:\/careers\/[^"']+|\/job\/[^"']+|\/jobs\/[^"']*)["']/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const extractApplicationEmail = (html) => {
  const match = String(html ?? '').match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)
  return match?.[0]?.toLowerCase() ?? null
}

export const hasVerifiedCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return (
    /<title[^>]*>\s*Careers\s*\|\s*Asteria Aerospace\s*<\/title>/i.test(rawHtml)
    || /<title[^>]*>\s*Explore Career Opportunities\s*\|\s*Asteria\s*<\/title>/i.test(rawHtml)
  )
    && normalized.includes('write to us at')
    && normalized.includes('featured roles')
}

export const hasUnexpectedPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createAsteriaAerospaceScraper = () => ({
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

      if (!hasVerifiedCareersPageSignal(careersHtml)) {
        throw new Error('Asteria Aerospace verified email-only careers surface no longer matches the known public page')
      }

      if (extractApplicationEmail(careersHtml) !== 'careers@asteria.co.in') {
        throw new Error('Asteria Aerospace verified careers application email changed')
      }

      if (hasUnexpectedPublicJobsSignal(careersHtml)) {
        throw new Error('Asteria Aerospace careers page now exposes public jobs')
      }

      return []
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createAsteriaAerospaceScraper().run(options)

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
