import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { provider as PROVIDER_METADATA } from './provider.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export { PROVIDER_METADATA }

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasVerifiedValGenesisCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)
  return /<title>\s*Careers\s*-\s*ValGenesis\s*<\/title>/i.test(page)
    && normalized.includes('Careers')
    && normalized.includes("Join the team, we're hiring!")
    && normalized.includes('Chennai')
    && normalized.includes('Bengaluru')
    && normalized.includes('Hyderabad')
}

export const hasPublicJobOpeningSignal = (html) => {
  const page = String(html ?? '')
  return /@type"\s*:\s*"JobPosting"/i.test(page)
    || /\bapply now\b/i.test(page)
    || /\bcurrent openings\b/i.test(page)
    || /href=["'][^"']*(?:job-boards\.greenhouse\.io|boards\.greenhouse\.io|jobs\.lever\.co|myworkdayjobs|workdayjobs)[^"']*["']/i.test(page)
    || /href=["'][^"']*\/careers\/[^"']+["']/i.test(page)
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const createValGenesisScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const page = await fetchPage(CAREERS_URL)
    if (page.status !== 200 || !hasVerifiedValGenesisCareersSignal(page.html)) {
      throw new Error('ValGenesis careers page no longer matches the verified first-party marketing surface')
    }
    if (hasPublicJobOpeningSignal(page.html)) {
      throw new Error('ValGenesis careers page now exposes a public jobs surface')
    }
    return []
  },
})

export const run = async (options = {}) => createValGenesisScraper().run(options)

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
