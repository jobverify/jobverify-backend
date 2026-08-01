import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "betterplace",
  "companyName": "BetterPlace",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-page-visible-cards",
  "companyCareerPage": "https://aj.betterplace.co.in/careers/",
  "companyDomain": "betterplace.co.in",
  "countryFilter": "India",
  "paginationStrategy": "single-first-party-careers-page",
  "extractionStrategy": "verified-first-party-careers-page+public-visible-job-cards+betterplace-select-subdomain",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-30",
  "verificationDisposition": "verified-public-careers-cards",
  "verifiedPublicJobCount": 18,
  "verifiedIndiaJobCount": 18,
  "verifiedSurfaceSummary": "Verified on Thursday, July 30, 2026 that https://www.betterplace.co.in/ explicitly directed job seekers to BetterPlace's careers page at https://aj.betterplace.co.in/careers/, and that the public Betterplace Select careers page exposed 18 live visible job cards across Operations and Business Development & Sales with stable data-value slugs including field-hr-executive-bangalore and staffing-manager-delhi. This scraper validates that verified public careers shell and returns the public India job cards from the official BetterPlace surface without inventing hidden detail data.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-visible-cards",
  "originalModulePath": "../workbookbatch02/betterplace.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch02\\betterplace.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
