import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INTERRA_INFORMATION_TECHNOLOGIES_CATALOG = {
  source: 'interrainformationtechnologies',
  companyName: 'Interra Information Technologies',
  officialBrandName: 'InterraIT',
  adapter: 'script',
  homepageUrl: 'https://interrait.com/',
  companyCareerPage: 'https://interrait.com/career/',
  jobsApiUrl: 'https://interrait.com/wp-json/wp/v2/jobs?per_page=100&_fields=id,slug,link,title,date,modified,content',
  atsPlatform: 'official-first-party-wordpress-jobs-api',
  countryFilter: 'India',
  paginationStrategy: 'single-public-wordpress-jobs-api',
  extractionStrategy: 'verified-first-party-careers-page+public-wordpress-jobs-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'interrait.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://interrait.com/career/ is the live first-party InterraIT careers page and that it publicly advertises open positions while first-party job detail routes live under https://interrait.com/jobs/. The site also exposes a public WordPress jobs endpoint at https://interrait.com/wp-json/wp/v2/jobs?per_page=100&_fields=id,slug,link,title,date,modified,content, which returned current openings including Microsoft Power Platform Architect (R&D Focus), Software Engineer (L5- Java Developer), and Sr. SharePoint Developer on the verified date.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INTERRA_INFORMATION_TECHNOLOGIES_CATALOG
