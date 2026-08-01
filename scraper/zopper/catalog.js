import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "zopper",
  "companyName": "Zopper",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-page-plus-public-linkedin-india-jobs-search",
  "companyCareerPage": "https://www.zopper.com/about-us/careers",
  "companyDomain": "zopper.com",
  "countryFilter": "India",
  "paginationStrategy": "verified-public-jobs-search",
  "extractionStrategy": "verified-first-party-careers-handoff+public-linkedin-india-jobs-search+india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "verified-public-linkedin-india-jobs-search",
  "verifiedPublicJobCount": 4,
  "verifiedIndiaJobCount": 4,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.zopper.com/about-us/careers was the live first-party Zopper careers page, that its See Open Positions CTA handed applicants to the public LinkedIn company jobs page at https://www.linkedin.com/company/zopper/jobs/, and that the public LinkedIn India jobs search at https://www.linkedin.com/jobs/search/?f_C=2760462&geoId=102713980 exposed current India roles including Relationship Manager (B2B Field Sales) - Bangalore and Business Development Manager, Bancassurance. This scraper validates those verified surfaces and returns jobs only from the public LinkedIn India jobs search.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-public-linkedin-india-jobs-search",
  "originalModulePath": "../workbookbatch06/zopper.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\zopper.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
