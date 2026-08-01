import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "locus",
  "companyName": "Locus",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-page-plus-public-freshteam-jobs-board",
  "companyCareerPage": "https://locus.sh/careers/",
  "companyDomain": "locus.sh",
  "countryFilter": "India",
  "paginationStrategy": "verified-public-jobs-board",
  "extractionStrategy": "verified-first-party-careers-handoff+public-freshteam-jobs-board+india-detail-pages",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "officialJobsBoardUrl": "https://locus.freshteam.com/jobs",
  "detailUrlPattern": "https://locus.freshteam.com/jobs/{opaque_id}/{slug}",
  "verifiedOn": "2026-07-30",
  "verificationDisposition": "verified-public-freshteam-jobs-board",
  "verifiedPublicJobCount": 12,
  "verifiedIndiaJobCount": 9,
  "verifiedSurfaceSummary": "Verified on Thursday, July 30, 2026 that https://locus.sh/careers/ was the live first-party Locus careers page, that its primary careers CTA labeled Explore Open Roles linked directly to the public Freshteam board at https://locus.freshteam.com/jobs, and that the board publicly exposed 12 current openings including India roles such as Senior Security Engineer and Sr. Technical Account Manager in Bengaluru. This scraper validates that verified official handoff and public Freshteam board, then returns the current India jobs from the visible public detail pages.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-public-freshteam-jobs-board",
  "originalModulePath": "../workbookbatch03/locus.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch03\\locus.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
