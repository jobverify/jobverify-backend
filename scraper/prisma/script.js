import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = 'prisma'
export const COMPANY = 'Prisma'
export const VERIFIED_ON = '2026-07-25'
export const OFFICIAL_SITE_URL = 'https://www.prisma.io/'
export const CAREERS_PAGE_URL = 'https://www.prisma.io/careers'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title[^>]*>\s*Careers\s*\|\s*Prisma\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.prisma\.io\/careers\/?["']/i.test(page)
    && text.includes('Join Prisma')
    && text.includes('Help us empower developers to build data-driven applications.')
    && text.includes('Prisma is building the data access layer for modern applications.')
    && text.includes(
      'Our team is globally distributed and everyone can work from any location within the UTC -5 to UTC +3 timezones.',
    )
}

export const hasZeroOpenRolesSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return text.includes('View open positions')
    && /Open roles Filter by department All 0 Subscribe to our newsletter/i.test(text)
}

export const createPrismaScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Prisma careers page no longer matches the verified first-party surface')
    }

    if (!hasZeroOpenRolesSignal(careersHtml)) {
      throw new Error('Prisma careers page changed and may now expose public roles')
    }

    return []
  },
})

export const run = async (options = {}) => createPrismaScraper().run(options)

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
