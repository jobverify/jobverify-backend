import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "yellowmessenger",
  "companyName": "Yellow Messenger",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-rebrand-careers-surface-plus-public-zohorecruit-board",
  "companyCareerPage": "https://yellow.ai/career/",
  "companyDomain": "yellow.ai",
  "countryFilter": "India",
  "paginationStrategy": "verified-public-zohorecruit-api",
  "extractionStrategy": "verified-rebrand-careers-surface+rendered-zohorecruit-handoff+public-jobs-api+published-india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-26",
  "verificationDisposition": "verified-public-zohorecruit-board-with-no-published-india-jobs",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Sunday, July 26, 2026 that Yellow Messenger now presents careers through the rebranded Yellow.ai surface at https://yellow.ai/career/, that the rendered public page exposed the official Zoho Recruit board at https://yellow.zohorecruit.in/jobs/Careers, and that the public Zoho payload returned one India role, GTM recruiter, marked Position filled with Publish false and Is_Locked true. This scraper validates the rendered first-party careers surface plus the public Zoho Recruit contract and returns only published India jobs when they are publicly available.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-rebrand-careers-surface-plus-public-zohorecruit-board",
  "originalModulePath": "../workbookbatch06/yellowmessenger.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\yellowmessenger.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
