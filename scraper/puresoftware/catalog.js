import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "puresoftware",
  "companyName": "PureSoftware",
  "officialBrandName": "PureSoftware",
  "adapter": "script",
  "companyCareerPage": "https://puresoftware.com/",
  "companyDomain": "puresoftware.com",
  "atsPlatform": "verified-first-party-placeholder-no-public-careers",
  "countryFilter": "India",
  "paginationStrategy": "verified-placeholder-or-historical-move-page-return-empty",
  "extractionStrategy": "verified-first-party-placeholder-or-historical-move-page+return-empty",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-08-04",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Tuesday, August 4, 2026 that runtime fetches to both https://puresoftware.com/ and https://www.puresoftware.com/ returned a Sucuri/Cloudproxy-served placeholder body of \"TEST DIMPLE\" instead of a trustworthy PureSoftware public jobs surface. The older static \"We've Moved\" Happiest Minds handoff may still appear in other caches, but neither verified surface exposes an exact-company public jobs inventory for PureSoftware.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "modulePath": path.join(currentDir, 'script.js'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-exact-name-public-company-surface",
  "originalModulePath": "../workbookbatch04/puresoftware.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\puresoftware\\jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
