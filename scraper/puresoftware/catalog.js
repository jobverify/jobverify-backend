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
  "atsPlatform": "verified-first-party-happiestminds-handoff-no-public-careers",
  "countryFilter": "India",
  "paginationStrategy": "verified-happiestminds-homepage-handoff-or-javascript-challenge-or-legacy-no-jobs-surface-return-empty",
  "extractionStrategy": "verified-first-party-happiestminds-homepage-handoff-or-javascript-challenge-or-legacy-no-jobs-surface+return-empty",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-08-15",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Saturday, August 15, 2026 that https://puresoftware.com/ still maps to Happiest Minds' shared web presence, but the fetch path from this environment now commonly sees a 307 JavaScript challenge page before browser-grade redirection continues to https://www.happiestminds.com/. Browser verification still resolves the domain to the Happiest Minds homepage, which exposes careers.happiestminds.com as the live careers handoff. PureSoftware no longer exposes an exact-company public jobs inventory on its own domain, so this provider returns [] while the separate happiestminds scraper owns the actual shared careers surface. Historical fallback acceptance remains in place for the older \"We've Moved\" page and the legacy Sucuri placeholder if they reappear.",
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
