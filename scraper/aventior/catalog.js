import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "aventior",
  "companyName": "Aventior",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-page-plus-linkedin-company-handoff-and-public-jobs-search",
  "companyCareerPage": "https://www.aventior.com/careers",
  "companyDomain": "aventior.com",
  "countryFilter": "India",
  "paginationStrategy": "verified-public-jobs-search",
  "extractionStrategy": "verified-first-party-careers-page+linkedin-company-handoff+public-jobs-search+india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "verified-public-linkedin-jobs-search",
  "verifiedPublicJobCount": 2,
  "verifiedIndiaJobCount": 2,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.aventior.com/careers was the live Aventior careers page, that its Follow Us link handed applicants to the public LinkedIn company page at https://www.linkedin.com/company/aventior/, and that the LinkedIn company page's See jobs button resolved to the public jobs search at https://www.linkedin.com/jobs/aventior-jobs-worldwide?f_C=27234995, which exposed current India roles including Technical Project Manager and R Shiny Engineer / R Developer. This scraper validates those verified surfaces and returns India jobs only from the public LinkedIn jobs search.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-linkedin-company-handoff-and-public-jobs-search",
  "originalModulePath": "../workbookbatch06/aventior.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\aventior.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
