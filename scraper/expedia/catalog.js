import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://careers.expediagroup.com/ is the live first-party Expedia Group careers homepage, that it hands Search Jobs to the first-party jobs index at https://careers.expediagroup.com/jobs/, and that the public jobs index exposes rel-next pagination to https://careers.expediagroup.com/jobs/?&mypage=1. Verified India role cards on the first-party jobs pages including Machine Learning Engineer II in India - Bangalore with first-party detail page https://careers.expediagroup.com/job/machine-learning-engineer-ii/bangalore-bangalore/R-107194/. Verified that the detail page exposes the official Workday apply handoff at https://expedia.wd108.myworkdayjobs.com/search/job/India---Bangalore/Machine-Learning-Engineer-II_R-107194/apply? plus first-party description, team, job type, and posting metadata.'

export const EXPEDIA_CATALOG = {
  source: 'expedia',
  companyName: 'Expedia',
  officialBrandName: 'Expedia Group',
  adapter: 'script',
  homepageUrl: 'https://careers.expediagroup.com/',
  companyCareerPage: 'https://careers.expediagroup.com/',
  jobsPageUrl: 'https://careers.expediagroup.com/jobs/',
  verifiedNextPageUrl: 'https://careers.expediagroup.com/jobs/?&mypage=1',
  sampleIndiaJobDetailUrl:
    'https://careers.expediagroup.com/job/machine-learning-engineer-ii/bangalore-bangalore/R-107194/',
  sampleIndiaApplyUrl:
    'https://expedia.wd108.myworkdayjobs.com/search/job/India---Bangalore/Machine-Learning-Engineer-II_R-107194/apply?',
  companyDomain: 'expediagroup.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-jobs-page-plus-rel-next-pagination',
  extractionStrategy:
    'verified-first-party-careers-page+verified-first-party-jobs-pages+india-card-filter+first-party-detail-pages+workday-apply-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'expedia/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default EXPEDIA_CATALOG
