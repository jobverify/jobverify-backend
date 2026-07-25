import { fileURLToPath } from 'node:url'

const modulePath = fileURLToPath(new URL('./script.js', import.meta.url))

export const AIG_BUSINESS_SOLUTION_CATALOG = {
  source: 'aigbusinesssolution',
  companyName: 'AIG Business Solution',
  officialBrandName: 'AIG Healthcare',
  adapter: 'script',
  modulePath,
  homepageUrl: 'https://aighealthcare.in/careers',
  companyCareerPage: 'https://aighealthcare.in/openings',
  companyDomain: 'aighealthcare.in',
  atsPlatform: 'first-party-openings-page-with-same-domain-job-assets',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-openings-page',
  extractionStrategy: 'verified-careers-shell+verified-openings-page+same-domain-opening-links',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://aighealthcare.in/careers linked to the first-party openings page at https://aighealthcare.in/openings and that the openings page included Join the rightful revolution, Join AIG Healthcare, Welcome to IKS Health, and visible same-domain opening assets such as Customer Service Representative.',
}

export default AIG_BUSINESS_SOLUTION_CATALOG
