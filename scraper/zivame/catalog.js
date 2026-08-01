import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "zivame",
  "companyName": "Zivame",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "companyCareerPage": "https://careers.zivame.com/",
  "companyDomain": "careers.zivame.com",
  "atsPlatform": "verified-first-party-careers-page-plus-same-origin-detail-pages",
  "countryFilter": "India",
  "paginationStrategy": "single-first-party-careers-page",
  "extractionStrategy": "verified-first-party-careers-page+public-same-origin-role-pages+india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-30",
  "verifiedPublicJobCount": 3,
  "verifiedIndiaJobCount": 3,
  "verifiedSurfaceSummary": "Verified on Thursday, July 30, 2026 that https://careers.zivame.com/ was the live first-party Zivame careers page, that its Department Job Openings section exposed public same-origin role pages including Frontend Developer, iOS Developer, and QA Engineer - Automation, and that each role page under /job-openings/{slug}/ exposed visible Job Category, Job Type, Job Location, and an application handoff. This scraper validates the verified careers shell and same-origin role-page contract, then returns the current India jobs from Zivame's official public careers surface.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-same-origin-detail-pages",
  "originalModulePath": "../workbookbatch02/zivame.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch02\\zivame.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
