import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.drreddys.com/ is the live Dr. Reddy\'s homepage careers handoff, that it links directly to the first-party careers site at https://careers.drreddys.com/, that the live public jobs board is https://careers.drreddys.com/jobs with 56 result(s) across 5 pages, that page 2 is exposed at https://careers.drreddys.com/jobs?page=2, and that the live India detail page https://careers.drreddys.com/job/data-analyst-hr-analytics-in-hyderabad-jid-5118 exposes the first-party apply workflow https://careers.drreddys.com/Workflow?workflowId=20a2c445-dcb2-41c7-84cc-87cd0423c8a2&vacancyId=5118.'

export const DR_REDDYS_LABORATORIES_CATALOG = {
  source: 'drreddyslaboratories',
  companyName: 'Dr. Reddy\'s Laboratories',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'drreddyslaboratories/jobs.json',
  homepageUrl: 'https://www.drreddys.com/',
  companyCareerPage: 'https://careers.drreddys.com/',
  jobsPageUrl: 'https://careers.drreddys.com/jobs',
  verifiedJobUrl: 'https://careers.drreddys.com/job/data-analyst-hr-analytics-in-hyderabad-jid-5118',
  verifiedApplyUrl: 'https://careers.drreddys.com/Workflow?workflowId=20a2c445-dcb2-41c7-84cc-87cd0423c8a2&vacancyId=5118',
  companyDomain: 'careers.drreddys.com',
  atsPlatform: 'first-party-attrax',
  countryFilter: 'India',
  paginationStrategy: 'first-party-attrax-html-pagination',
  extractionStrategy:
    'verified-homepage-handoff+verified-careers-landing+attrax-india-cards+detail-page-workflow-apply',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default DR_REDDYS_LABORATORIES_CATALOG
