import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = {
  "source": "lumaaiindia",
  "companyName": "Luma AI India",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "companyCareerPage": null,
  "companyDomain": null,
  "atsPlatform": "dedicated-local-empty-scraper",
  "countryFilter": "India",
  "paginationStrategy": "local-dedicated-empty-wrapper",
  "extractionStrategy": "local-dedicated-empty-wrapper-return-empty",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Workbook batch 01 exact-name sentinel for Luma AI India added on Saturday, July 25, 2026. It intentionally returns zero jobs until a trustworthy public careers surface is verified for this exact company name.",
  "backfillMode": "sentinel",
  "originalAdapter": "script",
  "originalAtsPlatform": "workbook-exact-name-sentinel",
  "originalModulePath": "../workbookbatch01/failClosedSentinel.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch01\\lumaaiindia.jobs.json"
}

export default PROVIDER_METADATA
