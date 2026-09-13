import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const QUADEYE_CATALOG = {
  source: 'quadeye',
  companyName: 'QuadEye',
  officialBrandName: 'Quadeye',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://www.quadeye.com/',
  companyCareerPage: 'https://www.quadeye.com/careers/',
  careersPortalUrl: 'https://quadeye.zohorecruit.in/jobs/Careers/',
  careersApiUrl:
    'https://quadeye.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  careersDetailHost: 'career.quadeye.com',
  companyDomain: 'quadeye.com',
  atsPlatform: 'zohorecruit',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-portal-api-inventory-equality',
  extractionStrategy:
    'verified-first-party-careers-page+public-zoho-api+job-location-scope',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'quadeye/jobs.json',
  verifiedOn: '2026-09-13',
  verifiedSurfaceSummary:
    "Verified on Sunday, September 13, 2026 that https://www.quadeye.com/careers/ redirects to the current Jobs | quadeye surface at https://www.quadeye.com/jobs. The official frontend uses Job_Location from its Zoho-backed public feed. The branded public portal https://quadeye.zohorecruit.in/jobs/Careers/ (Jobs at PeoplePlus) and https://quadeye.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite expose matching inventories of 25 public roles, including 20 current public India roles. Eight India roles have a blank Country field but explicit Gurugram Job_Location; unknown locations and inventory mismatches fail closed. Application links remain on career.quadeye.com.",
}

export default QUADEYE_CATALOG
