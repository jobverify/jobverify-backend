import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SISENSE_CATALOG = {
  source: 'sisense',
  companyName: 'Sisense',
  adapter: 'script',
  companyCareerPage: 'https://www.sisense.com/about/careers/',
  companyDomain: 'sisense.com',
  atsPlatform: 'greenhouse-board-api',
  countryFilter: 'India',
  paginationStrategy: 'single-greenhouse-board-feed',
  extractionStrategy:
    'verified-first-party-careers-page+official-greenhouse-board+official-greenhouse-board-api+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://www.sisense.com/about/careers/ remained the first-party Sisense careers page, that its public open-roles surface resolved to the official Greenhouse board at https://job-boards.greenhouse.io/embed/job_board?for=sisense, and that the companion public Greenhouse API feed at https://boards-api.greenhouse.io/v1/boards/sisense/jobs?content=true was live. The verified board exposed 3 public openings on the verified date: Site Reliability Engineer in Kyiv, Account Executive in Tel Aviv-Yafo, and Head of Sales in New York, NY, with zero India openings.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default SISENSE_CATALOG
