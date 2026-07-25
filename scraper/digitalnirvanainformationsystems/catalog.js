import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const DIGITAL_NIRVANA_INFORMATION_SYSTEMS_CATALOG = {
  source: 'digitalnirvanainformationsystems',
  companyName: 'Digital Nirvana Information Systems',
  officialBrandName: 'Digital Nirvana',
  adapter: 'script',
  homepageUrl: 'https://digital-nirvana.com/',
  companyCareerPage: 'https://digital-nirvana.com/',
  atsPlatform: 'official-company-site-unresolved-listing-contract',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-homepage-careers-fragments-without-public-job-links',
  extractionStrategy: 'verified-homepage-careers-fragments-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'digital-nirvana.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://digital-nirvana.com/ was the live first-party Digital Nirvana homepage, that its footer still exposed a Careers section with Fremont, USA and Hyderabad, India locations plus support@digital-nirvana.com, and that the page embedded multiple Required skill set blocks with Apply Now fragments. No stable public job titles or job detail links were exposed from a dedicated first-party careers surface, so this provider is fail-closed.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'digitalnirvanainformationsystems/jobs.json',
}

export default DIGITAL_NIRVANA_INFORMATION_SYSTEMS_CATALOG
