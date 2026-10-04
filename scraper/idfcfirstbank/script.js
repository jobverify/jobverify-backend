import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { createPhenomScraper } from '../../scraper-support/phenom/engine.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://careers.idfcfirst.bank.in/in/en'
export const RETAIL_BANKING_URL = 'https://careers.idfcfirst.bank.in/in/en/retail-banking'
export const TALENT_COMMUNITY_URL = 'https://careers.idfcfirst.bank.in/in/en/jointalentcommunity'
export const SEARCH_URL = 'https://careers.idfcfirst.bank.in/in/en/search-results'

const phenomScraper = createPhenomScraper({
  companyName: 'IDFC FIRST Bank',
  source: 'idfcfirstbank',
  baseUrl: 'https://careers.idfcfirst.bank.in',
  searchPath: '/in/en/search-results',
  scraperDir: currentDir,
})

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#xa0;|&#xA0;|&#160;|&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialCareersHomeSignal = (html) => {
  const rawPage = String(html ?? '')
  const page = normalizeWhitespace(html)

  return page.includes('Join IDFC FIRST Bank and Build a World-Class Bank')
    && page.includes('Build a world-class Bank with us!')
    && page.includes('Our Banking Verticals')
    && page.includes('Explore Jobs by Experience')
    && /\/in\/en\/jointalentcommunity/i.test(rawPage)
}

export const hasZeroJobSignal = (html) => {
  const page = normalizeWhitespace(html)
  const zeroJobMatches = page.match(/\b0 jobs\b/gi) || []

  return zeroJobMatches.length >= 3
    && page.includes('Retail Banking')
    && page.includes('Private Banking')
    && page.includes('Corporate Banking')
}

export const hasRetailBankingSignal = (html) => {
  const rawPage = String(html ?? '')
  const page = normalizeWhitespace(html)

  return page.includes('Join Retail Banking at IDFC FIRST Bank')
    && page.includes('Explore jobs in Retail Banking')
    && /\/in\/en\/jointalentcommunity/i.test(rawPage)
}

export const hasTalentCommunitySignal = (html) => {
  const page = normalizeWhitespace(html)

  return page.includes('Join Our Talent Community')
    && page.includes('Drop your resume to get frequent updates on various job openings.')
}

const PUBLIC_LISTING_PATTERN =
  /\b[1-9]\d*\s+jobs\b|\bjob[-\s_]?(?:card|listing|result)s?\b|\/job\/\d+\b|\/jobs\/details\/|jobId=|req(?:uisition)?Id=|apply now for this job|search open positions|search jobs/i

export const pageExposesPublicJobListings = (html) =>
  PUBLIC_LISTING_PATTERN.test(String(html ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'idfcfirstbank',
  timeoutMs: 15000,
})

export const createIdfcFirstBankScraper = () => ({
  async run(options = {}) {
    const { fetchText = defaultFetchText } = options
    const careersHomeHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersHomeSignal(careersHomeHtml)) {
      throw new Error('IDFC FIRST Bank official careers home changed; refusing to assume no public listings')
    }

    if (!hasZeroJobSignal(careersHomeHtml)) {
      return phenomScraper.run({ ...options, fetchText, useWidgetApi: options.useWidgetApi ?? true })
    }

    if (pageExposesPublicJobListings(careersHomeHtml)) {
      throw new Error('IDFC FIRST Bank careers home now appears to expose public job listings')
    }

    const retailBankingHtml = await fetchText(RETAIL_BANKING_URL)

    if (!hasRetailBankingSignal(retailBankingHtml)) {
      throw new Error('IDFC FIRST Bank retail banking careers page changed; refusing to assume the verified talent-community-only flow still applies')
    }

    if (pageExposesPublicJobListings(retailBankingHtml)) {
      throw new Error('IDFC FIRST Bank retail banking careers page now appears to expose public job listings')
    }

    const talentCommunityHtml = await fetchText(TALENT_COMMUNITY_URL)

    if (!hasTalentCommunitySignal(talentCommunityHtml)) {
      throw new Error('IDFC FIRST Bank talent community page changed; refusing to assume resume-drop flow still applies')
    }

    if (pageExposesPublicJobListings(talentCommunityHtml)) {
      throw new Error('IDFC FIRST Bank talent community page now appears to expose public job listings')
    }

    return []
  },
})

export const run = async (options = {}) => createIdfcFirstBankScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'idfcfirstbank')
  }
}
