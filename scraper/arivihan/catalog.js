import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "arivihan",
  "companyName": "Arivihan",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "companyCareerPage": "https://www.arivihan.com/about",
  "companyDomain": "arivihan.com",
  "atsPlatform": "official-company-site-no-public-careers",
  "countryFilter": "India",
  "paginationStrategy": "verified-homepage-plus-about-page-plus-missing-careers-route-validation",
  "extractionStrategy": "verified-exact-name-homepage+verified-about-page+verified-missing-careers-route-return-empty",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-30",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Thursday, July 30, 2026 that https://www.arivihan.com/ and https://www.arivihan.com/about both exposed the official Arivihan company surface with the About Us and Our Mission sections describing Arivihan's automated vernacular online learning platform, while https://www.arivihan.com/careers and https://arivihan.com/careers both returned public 404 pages instead of exposing trustworthy job listings. This provider now uses a verified exact-name no-public-careers scraper instead of a generic sentinel until Arivihan publishes a real public careers surface.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "official-company-site-no-public-careers",
  "originalModulePath": "../workbookbatch02/arivihan.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch02\\arivihan.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
