import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'infinitecomputersolutions'
export const COMPANY = 'Infinite Computer Solutions'
export const CAREERS_URL = 'https://www.infinite.com/careers'
export const BRASSRING_URL =
  'https://sjobs.brassring.com/TGNewUI/Search/Home/Home?partnerid=26656&siteid=5008'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /Welcome to Careers at Infinite/i.test(page)
    && /The work we do impacts the world, and the future!/i.test(page)
    && normalized?.includes('Explore Current Openings')
    && normalized?.includes("Can't find your job? Don't worry!")
    && normalized?.includes('Submit Your Resume')
}

export const extractBrassringUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const rawUrl = normalizeWhitespace(match[1])
    if (!rawUrl) continue

    try {
      const absoluteUrl = new URL(rawUrl, CAREERS_URL).toString()
      if (absoluteUrl === BRASSRING_URL) return absoluteUrl
    } catch {
      continue
    }
  }

  return null
}

export const hasInvalidBrassringSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /Search Jobs at \| Infinite Computer Solutions/i.test(page)
    && normalized?.includes("We're sorry, this link is no longer valid.")
    && normalized?.includes('Your session has expired due to inactivity.')
    && normalized?.includes('There are no jobs that match your criteria')
    && normalized?.includes('If you are interested in one of our other opportunities, please visit our career site.')
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createInfiniteComputerSolutionsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Infinite Computer Solutions careers page no longer matches the verified official careers surface')
    }

    const brassringUrl = extractBrassringUrl(careersHtml)
    if (brassringUrl !== BRASSRING_URL) {
      throw new Error('Infinite Computer Solutions careers page no longer links to the verified public BrassRing surface')
    }

    const brassringHtml = await fetchText(BRASSRING_URL)
    if (!hasInvalidBrassringSignal(brassringHtml)) {
      throw new Error('Infinite Computer Solutions public BrassRing surface now appears usable or changed shape')
    }

    return []
  },
})

export const run = async (options = {}) => createInfiniteComputerSolutionsScraper().run(options)

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
