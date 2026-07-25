import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const KISSFLOW_CATALOG = {
  source: 'kissflow',
  companyName: 'Kissflow',
  officialBrandName: 'Kissflow',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://careers.kissflow.com/',
  homepageUrl: 'https://kissflow.com/',
  verifiedRoleUrls: [
    'https://careers.kissflow.com/solution-advisor',
    'https://careers.kissflow.com/client-director',
    'https://careers.kissflow.com/manager-digital-marketing',
  ],
  companyDomain: 'kissflow.com',
  atsPlatform: 'official-company-site',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-open-positions-page-plus-detail-pages',
  extractionStrategy: 'verified-careers-page+listing-card-links+detail-pages-with-inline-apply-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'kissflow/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that the official Kissflow homepage at https://kissflow.com/ links Careers to the first-party jobs site https://careers.kissflow.com/, and that the live Open Positions section on that same first-party careers domain exposes public role cards plus role detail pages for Solution Advisor, Client Director, and Manager - Digital Marketing. Each verified role detail page exposes a title, experience band, India work location, job description, and inline apply form on the same first-party domain.',
}

export default KISSFLOW_CATALOG
