import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const CAREERS_URL = 'https://www.aadyah.com/careers'

const OFFICIAL_TITLE_PATTERN = /<title>\s*AADYAH\s+Aerospace\s*\|\s*Careers\s*<\/title>/i
const OFFICIAL_BRAND_PATTERN = /AADYAH\s+Aerospace/i
const OFFICIAL_LIFE_PATTERN = /LIFE\s+AT\s+AADYAH/i
const OFFICIAL_WORK_WITH_US_PATTERN = /WORK\s+WITH\s+US/i
const PUBLIC_LISTING_PATTERN = /\bjob[-\s_]?(?:card|listing|result)s?\b|\bopen\s+positions?\b|\bcurrent\s+openings?\b|<article[^>]+(?:job|opening)|<a[^>]*>\s*(?:apply|view)\s+(?:now|job)s?\s*<\/a>/i

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return OFFICIAL_TITLE_PATTERN.test(page)
    && OFFICIAL_BRAND_PATTERN.test(page)
    && OFFICIAL_LIFE_PATTERN.test(page)
    && OFFICIAL_WORK_WITH_US_PATTERN.test(page)
}

export const pageExposesPublicJobListings = (html) => PUBLIC_LISTING_PATTERN.test(String(html ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobverifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'aadyahaerospace',
  timeoutMs: 15000,
})

export const createAadyahAerospaceScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Aadyah Aerospace official careers surface changed; refusing to assume no public listings')
    }

    if (pageExposesPublicJobListings(careersHtml)) {
      throw new Error('Aadyah Aerospace official careers page now exposes public job listings and needs a structured scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createAadyahAerospaceScraper().run(options)
