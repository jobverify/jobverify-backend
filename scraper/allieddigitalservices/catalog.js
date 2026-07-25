import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ALLIED_DIGITAL_SERVICES_CATALOG = {
  source: 'allieddigitalservices',
  companyName: 'Allied Digital Services',
  officialBrandName: 'Allied Digital Services Ltd',
  adapter: 'script',
  companyCareerPage: 'https://www.allieddigital.net/in/careers/',
  companyDomain: 'allieddigital.net',
  indiaHomeUrl: 'https://www.allieddigital.net/in/',
  hiringNowPageUrl: 'https://www.allieddigital.net/in/careers/hiring-now/',
  verifiedFriendlyDetailUrl:
    'https://www.allieddigital.net/in/careers/senior-talent-acquisition-specialist-global/',
  verifiedBrokenRequestDetailUrl:
    'https://www.allieddigital.net/in/jobdetails?requestid=8154',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-root-geolocation-plus-single-first-party-hiring-now-page',
  extractionStrategy:
    'verified-root-geolocation+verified-india-careers-handoff+verified-hiring-now-tables+friendly-detail-link-when-present+listing-fallback-for-broken-request-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.allieddigital.net/ geolocation-redirects into the India site at https://www.allieddigital.net/in/, the first-party careers landing page at https://www.allieddigital.net/in/careers/ links to the live Hiring Now surface at https://www.allieddigital.net/in/careers/hiring-now/, and that Hiring Now page exposes public openings in first-party tables. Verified the friendly first-party detail page https://www.allieddigital.net/in/careers/senior-talent-acquisition-specialist-global/ is live, while the generic first-party request detail route https://www.allieddigital.net/in/jobdetails?requestid=8154 returned 404, so requestid rows are treated as listing-page-backed jobs.',
  dryRunFile: 'allieddigitalservices/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ALLIED_DIGITAL_SERVICES_CATALOG
