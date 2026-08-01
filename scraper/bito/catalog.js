import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "bito",
  "companyName": "Bito",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-page-plus-public-freshteam-jobs-board",
  "companyCareerPage": "https://bito.ai/careers/",
  "companyDomain": "bito.ai",
  "countryFilter": "India",
  "paginationStrategy": "verified-public-jobs-board",
  "extractionStrategy": "verified-first-party-careers-embed+public-freshteam-jobs-board+exact-detail-contract",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "verified-public-freshteam-jobs-board",
  "verifiedPublicJobCount": 1,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://bito.ai/careers/ was the live exact-name Bito careers page, that its open-roles section embedded the public Freshteam board at https://bito.freshteam.com/jobs, and that the board publicly exposed exactly one current opening: Account Executive, New Business (San Francisco Bay Area). The corresponding public Freshteam detail page visibly presented US preferred locations while hidden Freshteam list/schema metadata still referenced Pune, India, so this scraper validates that exact verified contract and extracts the public job conservatively from the visible detail page fields.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-public-freshteam-jobs-board",
  "originalModulePath": "../workbookbatch06/bito.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\bito.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
