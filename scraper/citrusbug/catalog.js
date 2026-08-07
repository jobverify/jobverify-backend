import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "citrusbug",
  "companyName": "CitrusBug",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-page-plus-public-same-page-application-form",
  "companyCareerPage": "https://citrusbug.com/career/",
  "companyDomain": "citrusbug.com",
  "countryFilter": "India",
  "paginationStrategy": "verified-first-party-same-page",
  "extractionStrategy": "verified-first-party-careers-page+same-page-application-form+india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-08-01",
  "verificationDisposition": "verified-first-party-same-page-application-form",
  "verifiedPublicJobCount": 3,
  "verifiedIndiaJobCount": 3,
  "verifiedSurfaceSummary": "Verified on Saturday, August 1, 2026 that https://citrusbug.com/career/ was the live exact-company CitrusBug careers surface, that it still publicly listed Ahmedabad onsite openings for Digital Marketing (Sr level), Executive Assistant (EA) to CEO, and Sales Head - IT Services, and that applicants were handled through the first-party on-page Apply for Job form plus the jobs@citrusbug.co contact channel. This scraper validates that verified same-page public contract and returns the public Ahmedabad roles from the official careers page.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-public-same-page-application-form",
  "originalModulePath": "../workbookbatch06/citrusbug.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\citrusbug.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
