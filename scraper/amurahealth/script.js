import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'amurahealth'
export const COMPANY = 'Amura Health'
export const JOBS_PAGE_URL = 'https://amura.ai/jobs/'
export const VERIFIED_PAGE_TITLE = 'Jobs at Amura - Adventure of your Lifetime'
export const REQUIRED_PAGE_SIGNALS = [
  'Working at Amura',
  'Growth is addictive',
  'Jobs at Amura',
  'Proudly powered by WordPress',
]
export const KNOWN_NON_ROLE_POST_TITLES = ['Growth is addictive']

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/article|\/section|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractTitle = (html) => normalizeWhitespace(
  String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
)

export const hasVerifiedJobsBlogSurface = (html) => {
  const page = String(html ?? '')
  const text = stripHtml(page) || ''

  return extractTitle(page) === VERIFIED_PAGE_TITLE
    && REQUIRED_PAGE_SIGNALS.every((signal) => text.includes(signal))
}

export const extractPublicPostTitles = (html) => {
  const page = String(html ?? '')
  const matches = [...page.matchAll(/<a\b[^>]*href="([^"]+\/jobs\/\d{4}\/\d{2}\/\d{2}\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]

  return [...new Set(matches
    .map((match) => stripHtml(match[2]))
    .filter((title) => title && !/^\d{4}-\d{2}-\d{2}$/.test(title)))]
}

export const hasKnownNonRolePostsOnly = (html) => {
  const titles = extractPublicPostTitles(html)
  if (titles.length !== KNOWN_NON_ROLE_POST_TITLES.length) return false

  return KNOWN_NON_ROLE_POST_TITLES.every((title) => titles.includes(title))
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createAmuraHealthScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(JOBS_PAGE_URL)

    if (!hasVerifiedJobsBlogSurface(html)) {
      throw new Error('Amura Health jobs page no longer matches the verified official public surface')
    }

    if (!hasKnownNonRolePostsOnly(html)) {
      throw new Error('Amura Health public jobs page now appears to expose new or structured openings')
    }

    return []
  },
})

export const run = async (options = {}) => createAmuraHealthScraper().run(options)

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
