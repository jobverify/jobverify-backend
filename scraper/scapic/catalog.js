import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "scapic",
  "companyName": "Scapic",
  "officialBrandName": "Scapic (Acquired by Flipkart)",
  "adapter": "script",
  "companyCareerPage": "https://www.flipkartcareers.com/jobslist",
  "companyDomain": "flipkartcareers.com",
  "atsPlatform": "verified-public-surface-fail-closed-sentinel",
  "countryFilter": "India",
  "paginationStrategy": "fail-closed-sentinel",
  "extractionStrategy": "verified-parent-careers-surface+acquisition-context+fail-closed-sentinel",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-08-04",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on August 4, 2026 that https://www.flipkartcareers.com/jobslist remained the live parent-company careers surface reviewed for Scapic after its Flipkart acquisition. The current page title is Flipkart Careers - Jobs @ India and exposes generic parent-company openings, but no explicit Scapic-specific text or job links were present, so this provider remains fail-closed and returns no jobs until a verifiable public Scapic-specific openings flow is implemented.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "modulePath": path.join(currentDir, 'script.js'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-public-surface-fail-closed-sentinel",
  "originalModulePath": "../workbookbatch04/scapic.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\scapic\\jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
