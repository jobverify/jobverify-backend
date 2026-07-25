import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.avanse.com/ is the live Avanse Financial Services homepage and links to the first-party careers shell at https://www.avanse.com/career. Verified that the careers shell shows public "Job Openings" cards with non-actionable href="#" links while its inline script points to the first-party jobs API at https://www.avanse.com/public/api/getAllJobs?city=mumbai, which returned a live 504 Gateway Time-out during verification. Verified also that https://www.avanse.com/careers, https://www.avanse.com/careers/, https://www.avanse.com/jobs, https://www.avanse.com/jobs/, https://www.avanse.com/work-with-us, and https://www.avanse.com/join-us all returned first-party 404s. There is no trustworthy public jobs surface right now.'

export const AVANSE_CATALOG = {
  source: 'avanse',
  companyName: 'Avanse',
  officialBrandName: 'Avanse Financial Services',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'avanse/jobs.json',
  companyCareerPage: 'https://www.avanse.com/career',
  homepageUrl: 'https://www.avanse.com/',
  jobsApiUrl: 'https://www.avanse.com/public/api/getAllJobs?city=mumbai',
  companyDomain: 'avanse.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-career-jobs-shell-plus-504-api-validation',
  extractionStrategy:
    'verified-homepage+verified-career-jobs-shell-with-non-actionable-cards+verified-first-party-jobs-api-504+verified-missing-alternate-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default AVANSE_CATALOG
