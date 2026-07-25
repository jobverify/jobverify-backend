import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.auxilo.com/ is the live Auxilo homepage, that https://www.auxilo.com/careers is the first-party careers page, and that it links job seekers to the public Workline entry URL https://app1176.workline.hr/candidate, which resolves to https://app1176.workline.hr/Cportal/GeneralOpening.aspx. Verified the public Workline listing API https://app1176.workline.hr/CPortal/generalopening.aspx/GetCurrentopening returned 21 live job records, and verified the public detail/apply route pattern on https://app1176.workline.hr/CandidatePortal/b48c8d0a-777c-4046-8617-f41f8bfe5004/Territory-Credit-Head---EIL-Job-in-Hyderabad-1325 with the public apply handoff https://app1176.workline.hr/Candidate/SignInv1.aspx?PRFCode=b48c8d0a-777c-4046-8617-f41f8bfe5004&Flag=C&DirectApply=1.'

export const AUXILO_CATALOG = {
  source: 'auxilo',
  companyName: 'Auxilo',
  officialBrandName: 'Auxilo Finserve',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'auxilo/jobs.json',
  companyCareerPage: 'https://www.auxilo.com/careers',
  homepageUrl: 'https://www.auxilo.com/',
  jobsBoardEntryUrl: 'https://app1176.workline.hr/candidate',
  jobsBoardUrl: 'https://app1176.workline.hr/Cportal/GeneralOpening.aspx',
  jobsApiUrl: 'https://app1176.workline.hr/CPortal/generalopening.aspx/GetCurrentopening',
  sampleDetailUrl:
    'https://app1176.workline.hr/CandidatePortal/b48c8d0a-777c-4046-8617-f41f8bfe5004/Territory-Credit-Head---EIL-Job-in-Hyderabad-1325',
  sampleApplyUrl:
    'https://app1176.workline.hr/Candidate/SignInv1.aspx?PRFCode=b48c8d0a-777c-4046-8617-f41f8bfe5004&Flag=C&DirectApply=1',
  companyDomain: 'auxilo.com',
  atsPlatform: 'workline-public-jobs-api',
  countryFilter: 'India',
  paginationStrategy: 'verified-careers-page-handoff-plus-single-workline-current-opening-api',
  extractionStrategy:
    'verified-homepage+verified-first-party-careers-page+workline-handoff+currentopening-json-api+detail-page-apply-validation',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default AUXILO_CATALOG
