import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, August 13, 2026 that https://nektar.ai/ and https://nektar.ai/careers/ each currently fail with repeated connect timeouts, while the historical official handoff pages remain live at https://docs.superhuman.com/@anusha-laksh/open-roles-for-website-publication and https://docs.superhuman.com/form/Kick-start-your-career-with-us_dfLGyijCu1N. Those public docs still expose culture/contact copy and a generic application form with no trustworthy current public job listings.'

export const NEKTAR_AI_CATALOG = {
  source: 'nektarai',
  companyName: 'Nektar AI',
  officialBrandName: 'Nektar.ai',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://nektar.ai/',
  companyCareerPage: 'https://nektar.ai/careers/',
  companyDomain: 'nektar.ai',
  officialOpenRolesUrl: 'https://coda.io/@anusha-laksh/open-roles-for-website-publication',
  officialApplyFormUrl: 'https://coda.io/form/Kick-start-your-career-with-us_dfLGyijCu1N',
  atsPlatform: 'official-careers-redirect-to-coda-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-redirect-plus-coda-surface-validation',
  extractionStrategy:
    'verified-timeout-only-first-party-routes+legacy-first-party-careers-redirect-and-coda-handoff-without-public-listings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-13',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default NEKTAR_AI_CATALOG
