import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INDUSTRY_BUYING_CATALOG = {
  source: 'industrybuying',
  companyName: 'IndustryBuying',
  officialBrandName: 'IndustryBuying',
  adapter: 'script',
  companyCareerPage: 'https://industrybuying.keka.com/careers/',
  officialHomepageUrl: 'https://www.industrybuying.com/',
  officialCareersHandoffPageUrl: 'https://www.industrybuying.com/',
  kekaCareerPageUrl: 'https://industrybuying.keka.com/careers/',
  kekaCareerPortalInfoUrl: 'https://industrybuying.keka.com/careers/api/organization/default/careerportalinfo',
  kekaActiveJobsUrl:
    'https://industrybuying.keka.com/careers/api/embedjobs/default/active/e3038951-eb0d-4a7c-86f2-ae81cdef2d70',
  expectedKekaIdentifier: 'e3038951-eb0d-4a7c-86f2-ae81cdef2d70',
  expectedKekaDomain: 'https://industrybuying.keka.com/careers/',
  expectedPortalName: 'IndustryBuying',
  atsPlatform: 'keka-embed-api',
  countryFilter: 'India',
  paginationStrategy: 'keka-embed-active-jobs-api',
  extractionStrategy:
    'verified-first-party-homepage-footer-handoff+verified-keka-bootstrap+verified-active-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'industrybuying.com',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that the official IndustryBuying homepage at https://www.industrybuying.com/ links Careers from the first-party footer to https://industrybuying.keka.com/careers/, that the public Keka bootstrap resolves the embedded careers document and default portal info endpoint for IndustryBuying, and that the active jobs API at https://industrybuying.keka.com/careers/api/embedjobs/default/active/e3038951-eb0d-4a7c-86f2-ae81cdef2d70 returned public India openings including Senior Manager Finance, Category Owner - June, Online Sales Executive, and Category Group Head - June.',
  dryRunFile: 'industrybuying/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INDUSTRY_BUYING_CATALOG
