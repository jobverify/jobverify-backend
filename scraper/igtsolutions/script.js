import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { IGT_SOLUTIONS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = IGT_SOLUTIONS_CATALOG.source
export const COMPANY = IGT_SOLUTIONS_CATALOG.companyName
export const VERIFIED_ON = IGT_SOLUTIONS_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = IGT_SOLUTIONS_CATALOG.verifiedSurfaceSummary
export const CAREERS_URL = IGT_SOLUTIONS_CATALOG.companyCareerPage
export const JOIN_SQUAD_URL = 'https://atain.com/join-the-squad/'
export const LEGACY_BOARD_URLS = [
  'https://careers.igtsolutions.com/',
  'https://careers.igtsolutions.com/go/India/8956655/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /class=["'][^"']*jobTitle-link[^"']*["']/i,
  /\bjobRecordsFound\b/i,
  /\bcurrent openings\b/i,
  /\bsearch jobs\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /successfactors/i,
  /oraclecloud/i,
  /darwinbox/i,
  /icims/i,
  /taleo/i,
]

const stripScriptAndStyle = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')

const normalizeWhitespace = (value) => stripScriptAndStyle(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Careers at Atain\s*\|\s*Grow, Innovate and Create Real Impact\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/atain\.com\/careers\/["']/i.test(rawHtml)
    && /href=["']https:\/\/atain\.com\/join-the-squad\/["']/i.test(rawHtml)
    && normalized.includes('Explore careers with us.')
}

export const hasJoinSquadSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /Join Our Squad/i.test(normalized)
    && /Upload Resume/i.test(normalized)
    && /Accommodations@atain\.com/i.test(rawHtml)
    && !hasPublicJobsSignal(rawHtml)
}

export const isLegacyBoardUnavailable = (page = {}) => {
  const status = Number(page.status)
  const rawUrl = String(page.url || '')

  return [401, 403, 404].includes(status)
    && /careers\.igtsolutions\.com/i.test(rawUrl)
    && !hasPublicJobsSignal(page.html)
}

export const createIgtSolutionsScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('IGT Solutions verified official careers page no longer matches the known first-party surface')
    }

    if (hasPublicJobsSignal(careersPage.html)) {
      throw new Error('IGT Solutions careers page now appears to expose a public jobs board')
    }

    const joinSquadPage = await fetchPage(JOIN_SQUAD_URL)
    if (joinSquadPage.status !== 200 || !hasJoinSquadSignal(joinSquadPage.html)) {
      throw new Error('IGT Solutions verified join-the-squad page no longer matches the known first-party form surface')
    }

    for (const legacyUrl of LEGACY_BOARD_URLS) {
      const legacyPage = await fetchPage(legacyUrl)
      if (!isLegacyBoardUnavailable(legacyPage)) {
        throw new Error(`IGT Solutions legacy careers board changed: ${legacyPage.url || legacyUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createIgtSolutionsScraper().run(options)

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
