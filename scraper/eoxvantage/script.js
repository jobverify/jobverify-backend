export const SOURCE = 'eoxvantage'
export const COMPANY = 'EOX Vantage'
export const HOMEPAGE_URL = 'https://eoxvantage.com/'
export const CAREERS_URL = 'https://eoxvantage.com/careers/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'EOX Vantage',
  adapter: 'script',
  modulePath: '../../scraper/eoxvantage/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-company-careers-no-public-openings',
  countryFilter: 'India',
  paginationStrategy: 'browser-rendered-single-page-no-public-openings-validation',
  extractionStrategy: 'verified-first-party-redesigned-careers-page+no-public-role-cards+india-filter-returns-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'eoxvantage.com',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://eoxvantage.com/careers/ is the live first-party EOX Vantage careers page, that the page now presents a redesigned employer-branding surface headed by "Start Your Career at EOX Vantage" with prompts to apply to a current opening or send a resume, and that it no longer exposes public role cards, location-specific openings, or Apply Now job handoffs on the page. No trustworthy India-located public opening was exposed during live verification.',
  dryRunFile: 'eoxvantage/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetch(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  redirect: 'follow',
}).then(async (response) => {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.text()
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers\s*\|\s*Start Your Career at EOX Vantage\s*<\/title>/i.test(page)
    && text.includes('Start Your Career at EOX Vantage')
    && text.includes('A tech company doing genuinely interesting work.')
    && text.includes('Two simple ways to take the next step.')
    && text.includes('Apply to a Current Opening')
    && text.includes('Send Us Your Resume')
    && !/Sales and Client Growth Executive/i.test(text)
    && !/Apply Now/i.test(text)
}

export const extractOpenings = () => []

const isIndiaLocation = (location) => /\bindia\b/i.test(String(location ?? ''))

export const run = async ({
  fetchText = defaultFetchText,
} = {}) => {
  const careersHtml = await fetchText(CAREERS_URL)
  if (!hasOfficialCareersSignal(careersHtml)) {
    throw new Error('EOX Vantage verified first-party careers page changed materially')
  }

  return extractOpenings(careersHtml)
    .filter((job) => isIndiaLocation(job.location))
    .map((job) => ({
      ...job,
      company: COMPANY,
      country: 'India',
      link: job.applyUrl || job.sourceUrl,
      source: SOURCE,
    }))
}

