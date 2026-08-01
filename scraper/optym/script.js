import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const HOMEPAGE_URL = 'https://www.optym.com/'
export const CAREERS_URL = 'https://www.optym.com/careers'

const PUBLIC_LISTING_PATTERN = /<(?:article|li|div|section)[^>]+(?:job[-\s_]?(?:card|listing|result)|career[-\s_]?(?:listing|opening)|opening[-\s_]?(?:card|item)|position[-\s_]?(?:card|item))[^>]*>|<a[^>]+href=["'][^"']*\/(?:jobs?|careers?)(?:\/[^"']*)?["'][^>]*>[^<]*(?:apply|view|details|opening)|\b(?:current openings?|open positions?|job openings?)\b/i

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Optym\s*\|\s*Transportation\s+Optimization\s+Software\s*<\/title>/i.test(page)
    && /Make the best move,\s*not just a good one\./i.test(page)
    && /In freight, speed matters, but so does precision\./i.test(page)
    && /drivers routed daily/i.test(page)
    && /Roadrunner/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Careers at Optym\s*\|\s*Join Our Team\s*<\/title>/i.test(page)
    && /Let(?:\u2019|&rsquo;|&apos;|&#39;|')s grow together/i.test(page)
    && /Optym is where amazing people \(like you\) can do their best work\./i.test(page)
    && /What Optymers say about working here:/i.test(page)
    && /Optymers around the world/i.test(page)
}

export const pageExposesPublicJobListings = (html) => (
  PUBLIC_LISTING_PATTERN.test(String(html ?? ''))
)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'optym',
  timeoutMs: 15000,
})

export const createOptymScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Optym homepage no longer matches the verified official public site')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Optym careers page no longer matches the verified official public site shape')
    }

    if (pageExposesPublicJobListings(careersHtml)) {
      throw new Error('Optym careers page now appears to expose public job listings')
    }

    return []
  },
})

export const run = async (options = {}) => createOptymScraper().run(options)
