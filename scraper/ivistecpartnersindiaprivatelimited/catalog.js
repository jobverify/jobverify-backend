import { fileURLToPath } from 'node:url'

const modulePath = fileURLToPath(new URL('./script.js', import.meta.url))

export const IVISTEC_PARTNERS_INDIA_PRIVATE_LIMITED_CATALOG = {
  source: 'ivistecpartnersindiaprivatelimited',
  companyName: 'iVistec Partners India Private Limited',
  officialBrandName: 'Vistec Partners',
  adapter: 'script',
  modulePath,
  homepageUrl: 'https://vistecpartners.com/Index.html',
  companyCareerPage: 'https://vistecpartners.com/Index.html',
  companyDomain: 'vistecpartners.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-about-contact-verification',
  extractionStrategy: 'verified-homepage+verified-about+verified-contact+no-first-party-careers-surface',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that the official Vistec Partners pages at /Index.html, /About.html, and /Contact-Us.html described the healthcare business, identified Noida, India, and exposed no trustworthy public jobs surface or first-party careers route.',
}

export default IVISTEC_PARTNERS_INDIA_PRIVATE_LIMITED_CATALOG
