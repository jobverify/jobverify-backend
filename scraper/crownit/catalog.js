import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "crownit",
  "companyName": "Crownit",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-surface-with-non-enumerable-apply-flow-and-resume-email",
  "companyCareerPage": "https://crownit.in/en/careers",
  "companyDomain": "crownit.in",
  "countryFilter": "India",
  "paginationStrategy": "fail-closed-sentinel",
  "extractionStrategy": "verified-first-party-careers-surface+internal-apply-flow+resume-email+no-public-listings-sentinel",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "no-trustworthy-exact-name-public-jobs-flow-verified-locally",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://crownit.in/en/careers was the live first-party Crownit careers surface reviewed for this workbook source, that it presented an internal non-enumerable Apply for job flow rendered through Crownit's own contact component, and that it directed referrals to hr@crownit.in. The reviewed surface exposed no trustworthy enumerable public jobs contract, no first-party public job inventory, and no handoff to a stable public ATS or exact-company public jobs board, so this company-local scraper stays fail-closed and returns no jobs until a stable exact-company public openings flow is verified.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-surface-with-non-enumerable-apply-flow-and-resume-email",
  "originalModulePath": "../workbookbatch06/crownit.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\crownit.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
