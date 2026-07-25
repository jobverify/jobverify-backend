import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'spauldingridge'
export const CAREERS_URL = 'https://spauldingridge.com/about-us/careers'
export const OPEN_POSITIONS_URL = 'https://spauldingridge.com/about-us/open-positions'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Careers at Spaulding Ridge\s*\|\s*Join Our Team\s*<\/title>/i.test(page)
    && /<h1>\s*Careers\s*<\/h1>/i.test(page)
    && /Join Spaulding Ridge for a transformative experience in your career journey/i.test(page)
    && /View Open Roles/i.test(page)
}

export const extractOpenPositionsUrl = (html) => {
  const page = String(html ?? '')
  const match = page.match(/<a[^>]+href="([^"]+)"[^>]*>\s*View Open Roles\s*<\/a>/i)

  if (!match) return null

  try {
    return new URL(match[1], CAREERS_URL).toString()
  } catch {
    return null
  }
}

export const hasOpenPositionsShellSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Open Positions\s*\|\s*Join Spaulding Ridge Careers\s*<\/title>/i.test(page)
    && /<h1>\s*Become Part of the Band\s*<\/h1>/i.test(page)
    && /Join our award-winning global team\./i.test(page)
    && /Take a look at our open positions below\./i.test(page)
}

const PUBLIC_JOB_LINK_PATTERN =
  /<a[^>]+href="[^"]*(?:jobs\.lever\.co|greenhouse\.io|greenhouse\.com|myworkdayjobs\.com|workable\.com|ashbyhq\.com|smartrecruiters\.com|jobvite\.com|icims\.com|\/job\/|\/jobs\/[^/"#?]+)[^"]*"[^>]*>/i

export const pageExposesPublicJobListings = (html) =>
  PUBLIC_JOB_LINK_PATTERN.test(String(html ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSpauldingRidgeScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Spaulding Ridge careers page no longer matches the verified official public surface')
    }

    const openPositionsUrl = extractOpenPositionsUrl(careersHtml)
    if (openPositionsUrl !== OPEN_POSITIONS_URL) {
      throw new Error('Spaulding Ridge careers page no longer links to the verified open positions surface')
    }

    const openPositionsHtml = await fetchText(OPEN_POSITIONS_URL)
    if (!hasOpenPositionsShellSignal(openPositionsHtml)) {
      throw new Error('Spaulding Ridge open positions page no longer matches the verified empty public shell')
    }

    if (pageExposesPublicJobListings(openPositionsHtml)) {
      throw new Error('Spaulding Ridge open positions page now exposes a public job board')
    }

    return []
  },
})

export const run = async (options = {}) => createSpauldingRidgeScraper().run(options)

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
