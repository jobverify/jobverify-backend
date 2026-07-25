import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BEO_SOFTWARE_CATALOG = {
  source: 'beosoftware',
  companyName: 'BEO Software',
  officialBrandName: 'BEO Software',
  adapter: 'script',
  companyCareerPage: 'https://beo-software.in/careers',
  companyDomain: 'beo-software.in',
  atsPlatform: 'official-first-party-job-cards',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy: 'verified-first-party-careers-page+same-page-job-list+first-party-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://beo-software.in/careers remained the live first-party BEO Software jobs page and that it publicly listed openings such as Senior Web Developer (WordPress, PHP, HTML, CSS), Senior Frontend Developer, Senior Big Data Engineer (Python | AWS), Senior Frontend Engineer (TypeScript/React), and Technical Lead ( Fullstack). The verified first-party listings exposed Location : Kochi and posted dates such as 24-03-2026 and 15-01-2026, with first-party detail pages under /careers-jobs-detail/.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default BEO_SOFTWARE_CATALOG
