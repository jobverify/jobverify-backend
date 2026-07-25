import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MOGLIX_CATALOG = {
  source: 'moglix',
  companyName: 'Moglix',
  officialBrandName: 'Moglix',
  adapter: 'script',
  companyCareerPage: 'https://www.moglix.com/career',
  officialJobsBoardUrl: 'https://moglix.flexiele.com/careers/moglix/jobs',
  careerSectionConfigurationUrl:
    'https://moglix-api.flexiele.com/api-pub/rec/careerSectionConfiguration/search',
  gridDefinitionUrl: 'https://moglix-api.flexiele.com/grid?gridCode=GRD0000837',
  jobsApiUrl: 'https://moglix-api.flexiele.com/api-pub/rec/careers/list',
  expectedSiteUrl: 'moglix',
  expectedSiteName: 'Moglix Careers',
  expectedGridCode: 'GRD0000837',
  expectedFormCode: 'FRM0001379',
  atsPlatform: 'flexiele-public-api',
  countryFilter: 'India',
  paginationStrategy: 'single-encrypted-flexiele-public-api-request',
  extractionStrategy:
    'verified-first-party-careers-page+verified-career-section-configuration+verified-grid-schema+encrypted-jobs-api+job-description-route+apply-route',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'moglix.com',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.moglix.com/career is the live first-party Moglix careers page and that it hands off to the public jobs board at https://moglix.flexiele.com/careers/moglix/jobs. Live verification on July 16, 2026 confirmed https://moglix-api.flexiele.com/api-pub/rec/careerSectionConfiguration/search for site_url=moglix, https://moglix-api.flexiele.com/grid?gridCode=GRD0000837, and https://moglix-api.flexiele.com/api-pub/rec/careers/list returning the public Moglix careers surface with 139 active public India vacancies including AM - Finance ( Credlix ), AD/D- Sales (B2C- Energy- Solar), and Java Software developer.',
  dryRunFile: 'moglix/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default MOGLIX_CATALOG
