import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "decathlonindia",
  "companyName": "Decathlon India",
  "adapter": "script",
  "atsPlatform": "digitalrecruiters",
  "companyCareerPage": "https://joinus.decathlon.in/en/annonces",
  "countryFilter": "India",
  "paginationStrategy": "digitalrecruiters-counted-api-pages",
  "extractionStrategy": "official-offers-shell+domain-bound-digitalrecruiters-api",
  "parser": "decathlon-india-digitalrecruiters-json",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-09-13",
  "verifiedPublicJobCount": 313,
  "verifiedIndiaJobCount": 313,
  "verificationDisposition": "live-official-complete-inventory-parser",
  "verifiedSurfaceSummary": "Verified on Sunday, September 13, 2026 that https://joinus.decathlon.in/en/annonces configures Decathlon India's DigitalRecruiters API, which exposed 313 jobs across four complete counted pages.",
  "backfillMode": "live-parser",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json')
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
