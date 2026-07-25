import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HAPPYFOX_CATALOG = {
  source: 'happyfox',
  companyName: 'HappyFox',
  officialBrandName: 'HappyFox',
  adapter: 'script',
  companyCareerPage: 'https://www.happyfox.com/jobs/',
  companyDomain: 'happyfox.com',
  atsPlatform: 'first-party-jobs-hub+trakstar-hire',
  countryFilter: 'India',
  paginationStrategy: 'verified-jobs-hub-plus-india-city-pages',
  extractionStrategy: 'verified-first-party-jobs-hub+india-city-listings+trakstar-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  officialJobsHubUrl: 'https://www.happyfox.com/jobs/',
  indiaCityPageUrls: [
    'https://www.happyfox.com/jobs/chennai/',
    'https://www.happyfox.com/jobs/bengaluru/',
    'https://www.happyfox.com/jobs/hyderabad/',
  ],
  trakstarJobsHost: 'https://happyfox.hire.trakstar.com',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on 2026-07-16 that the first-party HappyFox jobs hub at https://www.happyfox.com/jobs/ links to India city pages including https://www.happyfox.com/jobs/bengaluru/ and that those city pages currently hand off live roles such as Frontend Engineer and Technical Lead - Backend to the public Trakstar surface at happyfox.hire.trakstar.com.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default HAPPYFOX_CATALOG
