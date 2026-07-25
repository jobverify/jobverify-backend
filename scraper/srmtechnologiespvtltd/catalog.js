import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://www.srmtech.com/ is the live first-party SRM Technologies homepage, that its Careers With Us section links Open Positions to https://careers.srmtech.com/candidateportal, and that the first-party candidate portal currently redirects into an IAMSecurityError login gate whose public page requires Login and a TOTP-generated authenticator code. Because the verified first-party hiring surface is login-gated, this provider stays fail-closed until SRM exposes public listings.'

export const SRM_TECHNOLOGIES_PVT_LTD_CATALOG = {
  source: 'srmtechnologiespvtltd',
  companyName: 'SRM Technologies Pvt.Ltd',
  officialBrandName: 'SRM Technologies',
  adapter: 'script',
  homepageUrl: 'https://www.srmtech.com/',
  companyCareerPage: 'https://www.srmtech.com/',
  candidatePortalUrl: 'https://careers.srmtech.com/candidateportal',
  companyDomain: 'srmtech.com',
  atsPlatform: 'official-first-party-handoff-login-gated-candidate-portal',
  countryFilter: 'India',
  paginationStrategy: 'homepage-handoff-plus-login-gated-portal-validation',
  extractionStrategy:
    'verified-homepage-open-positions-handoff+verified-login-gated-candidateportal+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'srmtechnologiespvtltd/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SRM_TECHNOLOGIES_PVT_LTD_CATALOG
