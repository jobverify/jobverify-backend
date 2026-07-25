import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { IN_TIME_TEC_VISIONSOFT_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = IN_TIME_TEC_VISIONSOFT_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const INDIA_JOBS_URL = PROVIDER_METADATA.indiaJobsUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()

const PUBLIC_BOARD_SIGNAL_PATTERN = /total jobs found|search jobs|open positions/i

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return normalized.includes('Join us in creating')
    && normalized.includes('Careers at In Time Tec offer personal and professional development')
    && /https:\/\/careers\.intimetec\.in\/intimetec\/jobslist/i.test(rawHtml)
    && normalized.includes('India Careers')
}

export const isBlockedBoardPage = ({ status, url, html } = {}) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return Number(status) === 403
    && url === INDIA_JOBS_URL
    && normalized.includes('403 forbidden')
    && normalized.includes('request forbidden')
}

const isBlockedNetworkError = (error) => {
  const message = `${error?.message || ''} ${error?.code || ''}`.toLowerCase()
  return /403|forbidden|timed out|timeout|fetch failed|unable to connect|socket hang up|econnreset|enotfound/i
    .test(message)
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

export const createInTimeTecVisionsoftScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (Number(careersPage.status) !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('In Time Tec Visionsoft careers page no longer matches the verified first-party surface')
    }

    try {
      const jobsPage = await fetchPage(INDIA_JOBS_URL)
      if (isBlockedBoardPage(jobsPage)) {
        return []
      }
      if (Number(jobsPage.status) === 200 && PUBLIC_BOARD_SIGNAL_PATTERN.test(jobsPage.html || '')) {
        throw new Error('In Time Tec Visionsoft India board is reachable again and needs a real scraper upgrade')
      }
      throw new Error('In Time Tec Visionsoft India board changed materially and needs manual review')
    } catch (error) {
      if (isBlockedNetworkError(error)) {
        return []
      }
      throw error
    }
  },
})

export const run = async (options = {}) => createInTimeTecVisionsoftScraper().run(options)

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
