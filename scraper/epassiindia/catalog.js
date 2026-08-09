import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "epassiindia",
  "companyName": "Epassi India",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-page-plus-public-jobylon-embed-and-detail-pages",
  "companyCareerPage": "https://www.epassi.com/careers",
  "companyDomain": "epassi.com",
  "countryFilter": "India",
  "paginationStrategy": "verified-public-jobylon-embed",
  "extractionStrategy": "verified-first-party-careers-page+public-jobylon-embed+detail-pages+india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "verified-public-jobylon-embed-and-detail-pages",
  "verifiedPublicJobCount": 2,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.epassi.com/careers was the live first-party Epassi careers page for this workbook source, that its Our vacancies section was backed by the public Jobylon embed shell configured with company id 2253 at https://cdn.jobylon.com/jobs/companies/2253/embed/v1/?target=jobylon-jobs-widget&page_size=10, and that the linked public Jobylon detail pages on https://emp.jobylon.com/jobs/ exposed the location metadata needed to filter by country. On the verified Saturday, July 25, 2026 inventory, no public roles exposed India as a location, so this scraper validates the verified first-party and public Jobylon contract and returns India jobs only when the public Jobylon detail pages explicitly include India.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-public-jobylon-embed-and-detail-pages",
  "originalModulePath": "../workbookbatch06/epassiindia.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\epassiindia.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
