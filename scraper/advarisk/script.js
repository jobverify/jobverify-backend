import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const CAREERS_URL = 'https://advarisk.com/careers/'

const PUBLIC_LISTING_PATTERN = /<(?:article|li|div)[^>]+(?:job[-_ ]?(?:card|listing|result)|open[-_ ]?position|career[-_ ]?listing)[^>]*>[\s\S]*?<a[^>]+href=["'][^"']+[^>]*>\s*(?:apply|view|details)/i

export const hasOfficialCareersSurface = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Advarisk\s*<\/title>/i.test(page)
    && /AdavaRiskLogo\.png/i.test(page)
    && /Careers\s+at\s+AdvaRisk/i.test(page)
    && /Join\s+our\s+team\s+today/i.test(page)
    && /Be\s+a\s+part\s+of\s+AdvaRisk/i.test(page)
}

export const pageExposesPublicJobListings = (html) => (
  PUBLIC_LISTING_PATTERN.test(String(html ?? ''))
)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobverifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'advarisk',
  timeoutMs: 15000,
})

export const createAdvariskScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSurface(careersHtml)) {
      throw new Error('AdvaRisk official careers surface changed; refusing to assume no public listings')
    }

    if (pageExposesPublicJobListings(careersHtml)) {
      throw new Error('AdvaRisk careers page now exposes public job listings and needs a structured scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createAdvariskScraper().run(options)
