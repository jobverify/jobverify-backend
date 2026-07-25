import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AURIGO_CATALOG = {
  source: 'aurigo',
  companyName: 'Aurigo Software Technologies',
  officialBrandName: 'Aurigo Software Technologies',
  adapter: 'script',
  homepageUrl: 'https://www.aurigo.com/',
  companyCareerPage: 'https://careers.aurigo.com/',
  searchResultsUrl: 'https://careers.aurigo.com/search/?createNewAlert=false&locationsearch=&q=',
  companyDomain: 'aurigo.com',
  atsPlatform: 'official-first-party-search-results',
  countryFilter: 'India',
  paginationStrategy: 'page-number',
  extractionStrategy: 'html-search-results',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://careers.aurigo.com/ was the live first-party Aurigo Software Technologies careers surface, that it still presented the Explore open positions at Aurigo search experience, that its public search results exposed current openings on paginated first-party pages, and that the verified listings included Manager - Legal and Senior Software Engineer I - DevOps.',
  dryRunFile: 'aurigo/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AURIGO_CATALOG
