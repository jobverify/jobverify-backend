import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://navi.com/careers is the official first-party Navi careers page and that its View Open Roles button hands candidates to the public TurboHire board at https://navi.turbohire.co/dashboardv2?orgId=3e818601-0baa-429c-b6f8-4b21903ae0e6&type=0. Live verification on Thursday, July 16, 2026 confirmed that the public TurboHire no-auth token flow and filtered jobs API for org 3e818601-0baa-429c-b6f8-4b21903ae0e6 returned 45 public jobs.'

export const NAVI_CATALOG = {
  source: 'navi',
  companyName: 'Navi',
  officialBrandName: 'Navi Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'navi/jobs.json',
  homepageUrl: 'https://navi.com/',
  companyCareerPage: 'https://navi.com/careers',
  companyDomain: 'navi.com',
  handoffBoardUrl: 'https://navi.turbohire.co/dashboardv2?orgId=3e818601-0baa-429c-b6f8-4b21903ae0e6&type=0',
  turboHireOrgId: '3e818601-0baa-429c-b6f8-4b21903ae0e6',
  verifiedSampleJobUrl:
    'https://navi.turbohire.co/job/publicjobs/Cvxwte5N5snwG3hC%2FJkmZDU3RTVAq0zyKiiGLI4keyB3_3_ZUhAlZKVULxyMnx6q',
  atsPlatform: 'turbohire',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-handoff-plus-public-turbohire-api',
  extractionStrategy:
    'verified-first-party-careers-page+verified-turbohire-board+noauth-token+filteredjobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default NAVI_CATALOG
