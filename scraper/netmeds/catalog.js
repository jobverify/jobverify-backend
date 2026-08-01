import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "netmeds",
  "companyName": "Netmeds",
  "officialBrandName": "Netmeds",
  "adapter": "script",
  "companyCareerPage": "https://www.netmeds.com/",
  "companyDomain": "netmeds.com",
  "atsPlatform": "verified-exact-name-public-company-surface",
  "countryFilter": "India",
  "paginationStrategy": "fail-closed-sentinel",
  "extractionStrategy": "verified-exact-name-public-company-surface+no-public-listings-sentinel",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.netmeds.com/ was the live Netmeds exact-name public company surface and that it exposed no trustworthy public careers or jobs inventory. This provider stays fail-closed until Netmeds publishes a stable exact-name public openings surface.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "modulePath": path.join(currentDir, 'script.js'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-exact-name-public-company-surface",
  "originalModulePath": "../workbookbatch04/netmeds.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\netmeds\\jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
