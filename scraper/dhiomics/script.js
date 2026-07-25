import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = 'dhiOmics'
export const SOURCE = 'dhiomics'
export const DARWINBOX_COMPANY_ID = 'main'
export const DARWINBOX_ORIGIN = 'https://adaglobal.darwinbox.com'
export const OFFICIAL_HOMEPAGE_URL = 'https://dhiomics.com'
export const VERIFIED_REDIRECT_URL = 'https://adaglobal.com/'
export const OFFICIAL_CAREERS_URL = 'https://adaglobal.com/careers/'
export const PUBLIC_JOBS_URL =
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/allJobs`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const darwinboxScraper = createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html = '') => {
  const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const hasVerifiedDhiOmicsHomepageRedirect = ({
  status,
  url,
  html,
} = {}) => {
  const text = normalizeWhitespace(html) || ''

  return status === 200
    && url === VERIFIED_REDIRECT_URL
    && extractTitle(html) === 'ADA Global | The Data & AI Experience Company'
    && text.includes('The Data & AI Experience Company')
    && /https:\/\/adaglobal\.com\/careers\//i.test(String(html ?? ''))
}

export const extractPublicJobsUrl = (html = '') => {
  const match = String(html).match(
    /https:\/\/adaglobal\.darwinbox\.com\/ms\/candidatev2\/main\/careers\/allJobs/i,
  )

  return normalizeWhitespace(match?.[0])
}

export const hasVerifiedAdaCareersSignals = (html = '') => {
  const text = normalizeWhitespace(html) || ''

  return extractTitle(html) === 'Careers | Build What the Next Era Runs On | ADA Global'
    && text.includes('Build what the next era runs on')
    && text.includes('Discover career opportunities at ADA Global')
    && extractPublicJobsUrl(html) === PUBLIC_JOBS_URL
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const createDhiOmicsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  ...darwinboxScraper,
  async run({
    maxPages = config.maxPages,
    fetchPage = defaultFetchPage,
    fetchListingPage,
  } = {}) {
    const homepage = await fetchPage(OFFICIAL_HOMEPAGE_URL)

    if (!hasVerifiedDhiOmicsHomepageRedirect(homepage)) {
      throw new Error('dhiOmics verified official homepage redirect no longer matches the ADA Global handoff')
    }

    const careersPage = await fetchPage(OFFICIAL_CAREERS_URL)

    if (
      careersPage.status !== 200
      || careersPage.url !== OFFICIAL_CAREERS_URL
      || !hasVerifiedAdaCareersSignals(careersPage.html)
    ) {
      throw new Error('dhiOmics verified official careers page no longer matches the verified ADA Global public jobs surface')
    }

    const scrapedAt = now()
    const jobs = await darwinboxScraper.run({
      maxPages,
      maxJobs,
      fetchListingPage,
    })

    return jobs.map((job) => ({
      ...job,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createDhiOmicsScraper().run(options)

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
