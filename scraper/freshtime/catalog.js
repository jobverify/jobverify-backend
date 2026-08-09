import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "freshtime",
  "companyName": "Freshtime",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-exact-company-official-greencore-surface-with-no-enumerable-public-jobs-contract",
  "companyCareerPage": "https://www.greencore.com/ir-draft/why-invest-draft/strategy/freshtime/",
  "companyDomain": "greencore.com",
  "countryFilter": "India",
  "paginationStrategy": "fail-closed-sentinel",
  "extractionStrategy": "verified-exact-company-official-greencore-surface+no-public-listings-sentinel",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "no-trustworthy-exact-name-public-jobs-flow-verified-locally",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that the official Greencore Freshtime surface at https://www.greencore.com/ir-draft/why-invest-draft/strategy/freshtime/ identifies Freshtime as the acquired food-to-go business, while the Freshtime UK Limited legal entity was dissolved on September 23, 2025 and operations had transferred to Greencore Food to Go Limited. The reviewed exact-company surface is informational only and exposes no trustworthy enumerable Freshtime jobs contract, so this scraper remains fail-closed.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-exact-company-official-greencore-surface-with-no-enumerable-public-jobs-contract",
  "originalModulePath": "../workbookbatch06/freshtime.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\freshtime.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
