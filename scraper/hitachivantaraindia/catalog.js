import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HITACHI_VANTARA_INDIA_CATALOG = {
  source: 'hitachivantaraindia',
  companyName: 'Hitachi Vantara India',
  officialBrandName: 'Hitachi Vantara India',
  officialCompanyLabel: 'HITACHI VANTARA INDIA PRIVATE LIMITED',
  adapter: 'script',
  companyCareerPage: 'https://careers.hitachi.com/search/hitachi-vantara-india-private-limited/jobs',
  companyDomain: 'careers.hitachi.com',
  atsPlatform: 'talemetry-careersites+workday-handoff',
  countryFilter: 'India',
  paginationStrategy: 'single-public-company-filtered-search-page',
  extractionStrategy: 'official-html-search-results+detail-pages+apply-redirect',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://careers.hitachi.com/search/hitachi-vantara-india-private-limited/jobs is the live public company-filtered Hitachi careers page for HITACHI VANTARA INDIA PRIVATE LIMITED, that the page exposed India 19 company-filtered jobs including Software Development Expert in Bengaluru and Senior Technical Writer marked Remote, and that a public detail page such as https://careers.hitachi.com/jobs/17870993-software-development-expert exposed the Apply Now handoff to Hitachi Workday together with requisition, location, and job-category fields.',
  dryRunFile: 'hitachivantaraindia/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default HITACHI_VANTARA_INDIA_CATALOG
