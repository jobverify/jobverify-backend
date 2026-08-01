import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "avaamo",
  "companyName": "Avaamo",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-page-plus-public-same-origin-job-pages",
  "companyCareerPage": "https://avaamo.ai/careers/",
  "companyDomain": "avaamo.ai",
  "countryFilter": "India",
  "paginationStrategy": "verified-first-party-job-pages",
  "extractionStrategy": "verified-first-party-careers-page+same-origin-job-pages+india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "verified-first-party-same-origin-job-pages",
  "verifiedPublicJobCount": 7,
  "verifiedIndiaJobCount": 7,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://avaamo.ai/careers/ was the live first-party Avaamo careers page, that it exposed public same-origin Learn more job pages for active openings, and that trustworthy India listings were publicly available for Applied AI Engineer, Senior Software Engineer - Full-Stack, Senior QA Engineer, Conversational AI Lead or Architect, Conversation Designer, Product Manager, and Solution Delivery Manager. The reviewed Forward Deployed Engineer (FDE) card on the official careers page pointed to the full-stack detail page instead of an FDE detail page, so this scraper validates listing-to-detail title agreement and returns only India jobs whose first-party detail page matches the listing.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-public-same-origin-job-pages",
  "originalModulePath": "../workbookbatch06/avaamo.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\avaamo.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
