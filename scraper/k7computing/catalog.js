import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const K7_COMPUTING_CATALOG = {
  source: 'k7computing',
  companyName: 'K7 Computing',
  officialBrandName: 'K7 Computing',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  homepageUrl: 'https://www.k7computing.com/',
  companyCareerPage: 'https://careers.k7computing.com/',
  companyDomain: 'k7computing.com',
  atsPlatform: 'k7-computing-first-party-careers',
  countryFilter: 'Worldwide',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy: 'verified-first-party-careers-page+job-detail-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedPublicPostingCount: 1,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://www.k7computing.com/us/careers is the live K7 Computing careers handoff and links to the first-party careers site at https://careers.k7computing.com/. The linked site exposes a Current Openings section with a Sales Manager opening in Abu Dhabi and a first-party /index.php/jobs/sales-manager/ application link.',
}

export default K7_COMPUTING_CATALOG
