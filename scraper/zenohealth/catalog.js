import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "zenohealth",
  "companyName": "Zeno Health",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-public-careers-surface-with-linkedin-openings-handoff",
  "companyCareerPage": "https://corporate.zeno.health/careers",
  "companyDomain": "corporate.zeno.health",
  "countryFilter": "India",
  "paginationStrategy": "fail-closed-sentinel",
  "extractionStrategy": "verified-public-careers-surface+linkedin-openings-handoff+no-first-party-listings-sentinel",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-08-02",
  "verificationDisposition": "no-trustworthy-exact-name-public-jobs-flow-verified-locally",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Sunday, August 2, 2026 that https://corporate.zeno.health/careers remained the live first-party public careers surface reviewed for Zeno Health. The rendered surface still presented brand and culture content, including the copy \"View our LinkedIn page for current openings\", but no stable first-party enumerable public jobs contract was verified, so this company-local scraper stays fail-closed and returns no jobs until a trustworthy public openings flow is promoted.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-public-careers-surface-with-linkedin-openings-handoff",
  "originalModulePath": "../workbookbatch06/zenohealth.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\zenohealth.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
