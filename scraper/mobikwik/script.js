import { fetchTextWithRetry } from '../utils/fetch.js'

export const CAREERS_URL = 'https://www.mobikwik.com/careers'

const BRAND_PATTERN = /\bMobiKwik\b/i
const BENEFITS_PATTERN = /Work\s*@\s*MobiKwik\s*Benefits/i
const OPENINGS_PATTERN = /View\s+Job\s+Openings/i
const READY_TO_WORK_PATTERN = /Ready\s+To\s+Work\s+Together\?/i
const LINKEDIN_PATTERN = /linkedin\.com\/company\/mobikwik\/jobs\/?/i
const NAUKRI_PATTERN = /naukri\.com/i
const CAREERS_EMAIL_PATTERN = /\bta@mobikwik\.com\b/i

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return BRAND_PATTERN.test(page)
    && BENEFITS_PATTERN.test(page)
    && OPENINGS_PATTERN.test(page)
    && READY_TO_WORK_PATTERN.test(page)
}

export const hasExternalJobsHandoffSignal = (html) => {
  const page = String(html ?? '')
  return LINKEDIN_PATTERN.test(page)
    && NAUKRI_PATTERN.test(page)
    && CAREERS_EMAIL_PATTERN.test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'mobikwik',
  timeoutMs: 15000,
})

export const createMobiKwikScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('MobiKwik official careers surface changed; refusing to assume no public listings')
    }

    if (!hasExternalJobsHandoffSignal(careersHtml)) {
      throw new Error('MobiKwik careers handoff changed; refusing to assume the verified external jobs routes still apply')
    }

    return []
  },
})

export const run = async (options = {}) => createMobiKwikScraper().run(options)
