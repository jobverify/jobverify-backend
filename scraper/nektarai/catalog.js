import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on September 13, 2026 that https://nektar.ai/careers/ redirects to https://docs.superhuman.com/@anusha-laksh/open-roles-for-website-publication. The public document exposes culture and contact copy without a vacancy list or an explicit current empty state. Product demo text embedded in client scripts is not a Nektar job listing; this source remains incomplete until trustworthy vacancies or an explicit current no-open-roles statement are available.'

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
  atsPlatform: 'official-careers-coda-public-document',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-redirect-plus-coda-surface-validation',
  extractionStrategy:
    'verified-first-party-coda-handoff+explicit-current-empty-statement-required',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-09-13',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default NEKTAR_AI_CATALOG
