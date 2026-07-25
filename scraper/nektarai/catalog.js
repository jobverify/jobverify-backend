import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://nektar.ai/ is the official Nektar.ai homepage and that https://nektar.ai/careers/ returned a first-party 301 redirect to the public Coda open-roles document at https://coda.io/@anusha-laksh/open-roles-for-website-publication. The official open-roles document plus the linked apply form at https://coda.io/form/Kick-start-your-career-with-us_dfLGyijCu1N were public, but they exposed culture/contact copy and a generic application form with no trustworthy current public job listings.'

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
    'verified-first-party-careers-redirect+verified-coda-open-roles-doc+verified-coda-apply-form-without-public-listings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default NEKTAR_AI_CATALOG
