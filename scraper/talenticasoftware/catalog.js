import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TALENTICA_SOFTWARE_CATALOG = {
  source: 'talenticasoftware',
  companyName: 'Talentica Software',
  officialBrandName: 'Talentica',
  adapter: 'script',
  homepageUrl: 'https://www.talentica.com/careers/',
  companyCareerPage: 'https://www.talentica.com/job-openings/',
  atsPlatform: 'official-first-party-job-card-grid',
  countryFilter: 'India',
  paginationStrategy: 'single-page-job-card-grid',
  extractionStrategy: 'verified-first-party-job-card-grid+direct-detail-links+public-experience-labels',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'talentica.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.talentica.com/job-openings/ is the live first-party Talentica openings page and that it publicly lists current openings in a job-card grid, including Senior Data Engineer, QA LLM Engineer, and Software Developer- Golang with direct first-party detail links and public experience labels.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default TALENTICA_SOFTWARE_CATALOG
