import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import provider from './provider.js'

export const SOURCE = provider.source
export const COMPANY = provider.companyName
export const HOMEPAGE_URL = provider.homepageUrl
export const CAREERS_URL = provider.companyCareerPage
export const PROVIDER_METADATA = provider

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&#8211;|&ndash;|&mdash;/gi, '-')
  .replace(/<[^>]+>/g, ' ')
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

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*Career at BuyUcoin\b/i.test(page)
    && /Job[\s\S]{0,80}Opportunities/i.test(page)
    && /Software Developer-\s*Node\.js/i.test(page)
    && /Software Quality Analyst Engineer/i.test(page)
}

export const extractInlineOpenings = (html = '') => {
  const page = String(html ?? '')
  const jobs = []
  const cardPattern = /<div[^>]*class=["'][^"']*\bcr__job-card\b[^"']*["'][^>]*>[\s\S]*?<h[1-6][^>]*>\s*([\s\S]*?)\s*<\/h[1-6]>[\s\S]*?<p[^>]*>\s*([\s\S]*?)\s*<\/p>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?Apply Now[\s\S]*?<\/a>/gi
  const fallbackPattern = /<h6[^>]*>\s*([^<]+?)\s*<\/h6>[\s\S]{0,200}?<p[^>]*>\s*([^<]+?)\s*<\/p>[\s\S]{0,300}?<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?Apply Now[\s\S]*?<\/a>/gi

  const matches = [...page.matchAll(cardPattern)]
  const iterable = matches.length > 0 ? matches : [...page.matchAll(fallbackPattern)]

  for (const match of iterable) {
    const title = normalizeWhitespace(match[1])
    const location = normalizeWhitespace(match[2])
    const applyUrl = new URL(match[3], CAREERS_URL).toString()

    if (!title || /^(Job Opportunities|Learn Our Recruitment Process)$/i.test(title)) continue
    if (!location || !/india/i.test(location)) continue

    jobs.push({
      title,
      location,
      sourceUrl: CAREERS_URL,
      applyUrl,
    })
  }

  return jobs
}

export const createBuyUcoinScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Verified BuyUcoin careers page changed materially')
    }

    const jobs = extractInlineOpenings(careersHtml)
    if (!jobs.length) {
      throw new Error('Verified BuyUcoin careers page no longer exposes inline openings')
    }

    return jobs.map((job) => ({
      title: job.title,
      location: job.location,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      company: COMPANY,
      country: 'India',
      link: job.applyUrl,
      source: SOURCE,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createBuyUcoinScraper().run(options)
