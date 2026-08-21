import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VALTECH_INDIA_SYSTEMS_CATALOG = {
  source: 'valtechindiasystems',
  companyName: 'Valtech India Systems',
  officialBrandName: 'Valtech',
  adapter: 'script',
  homepageUrl: 'https://www.valtech.com/en-in/career/',
  companyCareerPage: 'https://www.valtech.com/en-in/career/jobs/',
  jobListingsUrl: 'https://www.valtech.com/en-in/career/jobs/',
  jobsApiUrl: 'https://www.valtech.com/joblist/getjsonresult?id=1571&language=en-IN&limit=100',
  indiaCountryTag: '2423-india',
  sampleJobUrl: 'https://www.valtech.com/en-in/career/jobs/4944510101/',
  atsPlatform: 'first-party-careers-page-plus-first-party-joblist-api-plus-greenhouse-apply-handoff',
  countryFilter: 'India',
  paginationStrategy: 'first-party-json-joblist-country-filter',
  extractionStrategy: 'verified-careers-landing+verified-joblist-page+first-party-joblist-api+detail-pages+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'valtech.com',
  verifiedOn: '2026-08-14',
  verifiedPublicJobCount: 184,
  verifiedIndiaJobCount: 37,
  verifiedSurfaceSummary:
    'Verified on Friday, August 14, 2026 that https://www.valtech.com/en-in/career/ remained the live first-party Valtech India careers landing page titled "Career | Valtech", and that it now hands job seekers to the first-party job list at https://www.valtech.com/en-in/career/jobs/ rather than publishing the old visible job-card HTML contract directly on the landing page. Verified that https://www.valtech.com/en-in/career/jobs/ is the live first-party Jobs page titled "Jobs | Valtech" and that it exposes the same-origin JSON feed https://www.valtech.com/joblist/getjsonresult?id=1571&language=en-IN&limit=100. Verified that querying that feed with the live India country tag 2423-india returned 37 India jobs out of 184 public jobs overall, including Technology Consultant, ReactJS Lead Developer, SAP Commerce/Hybris Lead developer, Senior SAP Commerce Cloud/Hybris Developer, and SAP Commerce/Hybris-Developer in Bengaluru. Verified that first-party detail pages such as https://www.valtech.com/en-in/career/jobs/4944510101/ still keep the role content on Valtech\'s own domain and use Greenhouse only for the external apply handoff.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default VALTECH_INDIA_SYSTEMS_CATALOG
