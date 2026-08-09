export const CAREERS_URL = 'https://aarbeestructures.com/careers/'

const STRUCTURED_JOB_LISTING_PATTERN = /<(?:article|li|div)[^>]+(?:job-card|job-listing|current-opening)[^>]*>[\s\S]*?<a[^>]+href=["'][^"']*(?:\/jobs?\/|\/careers?\/)[^"']*["'][^>]*>[^<]*(?:apply|view|details)/i

export const hasOfficialCareersSignal = (html) => {
  const page = String(html || '')

  return /<title>\s*Careers\s*-\s*Aarbee Structures\s*<\/title>/i.test(page)
    && /Aarbee Career/i.test(page)
    && /Current Openings/i.test(page)
    && /Aarbee Structures Pvt\.?\s*Ltd\.?/i.test(page)
}

export const pageExposesStructuredJobListings = (html) => STRUCTURED_JOB_LISTING_PATTERN.test(String(html || ''))

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobverifyCareerScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createAarbeeStructuresScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const pageHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(pageHtml)) {
      throw new Error('Aarbee Structures official careers surface no longer matches the verified public page')
    }

    if (pageExposesStructuredJobListings(pageHtml)) {
      throw new Error('Aarbee Structures careers page now exposes structured public job listings and needs a dedicated scraper')
    }

    return []
  },
})

export const run = async () => createAarbeeStructuresScraper().run()
