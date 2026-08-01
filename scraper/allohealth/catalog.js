import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "allohealth",
  "companyName": "Allo Health",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "companyCareerPage": "https://www.allohealth.com/about",
  "companyDomain": "allohealth.com",
  "atsPlatform": "official-company-site-no-public-careers",
  "countryFilter": "India",
  "paginationStrategy": "verified-homepage-plus-about-page-plus-missing-careers-route-and-non-www-alias-validation",
  "extractionStrategy": "verified-exact-name-homepage+verified-about-page+verified-missing-careers-route-return-empty",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-30",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Thursday, July 30, 2026 that https://www.allohealth.com/ and https://www.allohealth.com/about were live exact-name first-party Allo Health surfaces, that the about page exposed About Us plus the structured healthcare ecosystem and 70+ cities company copy, and that https://www.allohealth.com/careers returned a public 404 page instead of exposing trustworthy job listings. The non-www alias at https://allohealth.com/careers resolved to the same missing careers route. This provider now uses a verified exact-name no-public-careers scraper instead of a generic sentinel until Allo Health publishes a real public careers surface.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "official-company-site-no-public-careers",
  "originalModulePath": "../workbookbatch02/allohealth.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch02\\allohealth.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
