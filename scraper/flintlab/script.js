import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'flintlab'
export const COMPANY = 'FlintLab'
export const HOMEPAGE_URL = 'https://flintlab.io/'
export const SITEMAP_URL = 'https://flintlab.io/sitemap.xml'
export const NO_PUBLIC_CAREERS_ROUTE_URLS = [
  'https://flintlab.io/careers',
  'https://flintlab.io/careers/',
  'https://flintlab.io/career',
  'https://flintlab.io/career/',
  'https://flintlab.io/jobs',
  'https://flintlab.io/jobs/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const CAREERS_SIGNAL_PATTERN = /\b(career|careers|job|jobs|opening|openings|vacancy|vacancies|join us|work with us)\b/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u2014/g, '-')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /FlintLab Sirius - Device Infrastructure PaaS/i.test(normalized)
    && /Begin Your Journey Towards Precision Testing/i.test(normalized)
    && /FlintLab powers efficient, collaborative testing across devices\./i.test(normalized)
    && /Ask Flint Nexus Pioneers/i.test(normalized)
    && /mailto:engage@flintlab\.io/i.test(rawHtml)
    && /linkedin\.com\/company\/flintlab-inc/i.test(rawHtml)
}

export const sitemapHasCareerLikeUrl = (xml) => {
  const matches = String(xml ?? '').match(/<loc>([^<]+)<\/loc>/gi) || []
  return matches.some((entry) => CAREERS_SIGNAL_PATTERN.test(entry))
}

export const isMissingCareerRoute = (page) => Number(page?.status) === 404

export const createFlintLabScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('FlintLab verified official homepage no longer matches the known public surface')
    }

    if (CAREERS_SIGNAL_PATTERN.test(homepage.html)) {
      throw new Error('FlintLab homepage now appears to expose a public careers signal')
    }

    const sitemap = await fetchPage(SITEMAP_URL)
    if (sitemap.status !== 200 || sitemapHasCareerLikeUrl(sitemap.html)) {
      throw new Error('FlintLab verified sitemap no longer matches the no-public-careers surface')
    }

    for (const routeUrl of NO_PUBLIC_CAREERS_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isMissingCareerRoute(routePage)) {
        throw new Error(`FlintLab verified no-public-careers route changed: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createFlintLabScraper().run(options)

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
