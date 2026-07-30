import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AIRBYTE_CATALOG = {
  source: 'airbyte',
  companyName: 'Airbyte',
  officialBrandName: 'Airbyte',
  adapter: 'script',
  companyCareerPage: 'https://airbyte.com/company/careers',
  ashbyPublicBoardUrl: 'https://jobs.ashbyhq.com/airbyte',
  ashbyJobBoardUrl: 'https://api.ashbyhq.com/posting-api/job-board/airbyte',
  companyDomain: 'airbyte.com',
  atsPlatform: 'ashby',
  countryFilter: 'India',
  paginationStrategy: 'single-public-ashby-job-board-get',
  extractionStrategy:
    'verified-first-party-careers-page+verified-public-ashby-board+public-ashby-get-feed+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that the first-party careers page at https://airbyte.com/company/careers was live with the Airbyte careers shell, that the public Ashby board at https://jobs.ashbyhq.com/airbyte was live and exposed Airbyte job titles including Engineering Manager, Platform and Senior AI Platform Engineer, and that the public Ashby GET feed at https://api.ashbyhq.com/posting-api/job-board/airbyte exposed 14 listed roles. The verified public Airbyte jobs surface had zero India openings on the verified date, so the scraper should return an authoritative empty India result until India-targeted roles appear.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AIRBYTE_CATALOG
