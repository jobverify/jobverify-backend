import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cuelogic'
export const COMPANY = 'Cuelogic'
export const CAREERS_URL = 'https://careers.ltimindtree.com/search/'
export const SEARCH_TERM = 'Cuelogic'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

export const buildSearchUrl = () => {
  const url = new URL(CAREERS_URL)
  url.searchParams.set('createNewAlert', 'false')
  url.searchParams.set('q', SEARCH_TERM)
  url.searchParams.set('optionsFacetsDD_country', '')
  url.searchParams.set('optionsFacetsDD_location', '')
  url.searchParams.set('locationsearch', '')
  return url.toString()
}

export const pageExposesOpenJobs = (html) => /class=["']data-row["']/i.test(String(html ?? ''))
  || /class=["']jobTitle-link["']/i.test(String(html ?? ''))

export const hasVerifiedEmptySearchSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /LTIMindtree/i.test(page)
    && (
      /Results\s*0\s*of\s*0/i.test(text)
      || /The\s+0\s+most recent jobs posted by LTM are listed below/i.test(text)
    )
    && /There are currently no open positions matching\s*"\s*Cuelogic\s*"\./i.test(text)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createCuelogicScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const searchHtml = await fetchText(buildSearchUrl())

    if (!hasVerifiedEmptySearchSignal(searchHtml) || pageExposesOpenJobs(searchHtml)) {
      throw new Error('Cuelogic verified LTIMindtree empty-search surface changed or now exposes public jobs')
    }

    return []
  },
})

export const run = async (options = {}) => createCuelogicScraper().run(options)

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
