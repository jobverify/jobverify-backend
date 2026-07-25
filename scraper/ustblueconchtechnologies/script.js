import { fetchTextWithRetry } from '../utils/fetch.js'

export const SOURCE = 'ustblueconchtechnologies'
export const COMPANY = 'UST BlueConch Technologies'
export const UST_CAREERS_URL = 'https://www.ust.com/en/careers'
export const BLUECONCH_REFERENCE_URL =
  'https://www.ust.com/en/who-we-are/ust-newsroom/ust-blueconch-wins-excellence-award-for-best-security-practices-in-it-ites-sector'

const PUBLIC_BLUECONCH_JOBS_PATTERN = /blueconch[\s\S]{0,120}(open positions|current openings|apply now|job openings)/i

export const hasBlueConchReferenceSignal = (html) => {
  const page = String(html ?? '')
  return /About\s+UST\s+BlueConch/i.test(page)
    && /UST\s+BlueConch/i.test(page)
    && /ust\.com\/blueconch/i.test(page)
}

export const hasGenericUstCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Find your next role at UST/i.test(page)
    && /Discover UST/i.test(page)
    && /careers@ust\.com|USCareers@ust\.com/i.test(page)
}

export const pageExposesBlueConchSpecificJobs = (html) => PUBLIC_BLUECONCH_JOBS_PATTERN.test(String(html ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'ustblueconchtechnologies',
  timeoutMs: 15000,
})

export const createUstBlueConchTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const referenceHtml = await fetchText(BLUECONCH_REFERENCE_URL)
    const careersHtml = await fetchText(UST_CAREERS_URL)

    if (!hasBlueConchReferenceSignal(referenceHtml)) {
      throw new Error('UST BlueConch Technologies first-party reference page no longer matches the verified surface')
    }

    if (!hasGenericUstCareersSignal(careersHtml)) {
      throw new Error('UST BlueConch Technologies parent careers page no longer matches the verified generic UST surface')
    }

    if (pageExposesBlueConchSpecificJobs(careersHtml)) {
      throw new Error('UST BlueConch Technologies now exposes a BlueConch-specific public jobs surface and needs a structured scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createUstBlueConchTechnologiesScraper().run(options)
