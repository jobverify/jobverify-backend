import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "zoopplusindia",
  "companyName": "ZoopPlus India",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-role-cards-with-shared-google-form-apply",
  "companyCareerPage": "https://www.zoop.one/career",
  "companyDomain": "zoop.one",
  "countryFilter": "India",
  "paginationStrategy": "single-rendered-first-party-role-card-grid",
  "extractionStrategy": "verified-official-brand-careers-surface+rendered-first-party-role-cards+shared-google-form-apply",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-08-02",
  "verificationDisposition": "verified-rendered-first-party-role-card-grid",
  "verifiedPublicJobCount": 6,
  "verifiedIndiaJobCount": 6,
  "verifiedSurfaceSummary": "Verified on Sunday, August 2, 2026 that https://www.zoop.one/career was the live official ZOOP careers surface reviewed for workbook company ZoopPlus India, and that the rendered first-party page now exposed public role cards for Pune openings such as ML Lead, SDE2- Backend Developer, and Quality Analyst, all applying through the current shared Google Forms route. This scraper validates the current first-party careers surface and returns the rendered India role cards while that public contract remains stable.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-official-brand-careers-surface-fail-closed",
  "originalModulePath": "../workbookbatch06/zoopplusindia.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\zoopplusindia.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
