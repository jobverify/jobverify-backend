import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "boonai",
  "companyName": "BoonAI",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-public-platform-and-recruiter-surfaces-without-exact-company-careers-contract",
  "companyCareerPage": "https://www.boonindia.ai/about",
  "companyDomain": "boonindia.ai",
  "countryFilter": "India",
  "paginationStrategy": "fail-closed-sentinel",
  "extractionStrategy": "verified-public-platform-and-recruiter-surfaces+no-exact-company-openings-sentinel",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "no-trustworthy-exact-name-public-jobs-flow-verified-locally",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.boonindia.ai/ and https://www.boonindia.ai/about were the live official public Boon.ai surfaces reviewed for workbook company BoonAI, that https://www.boonindia.ai/pricing and https://employer.boonindia.ai/register exposed recruiter-facing marketplace and agency registration flows, and that those reviewed surfaces established Boon.ai as an overseas jobs platform rather than a trustworthy exact-company BoonAI careers contract. This company-local scraper stays fail-closed and returns no jobs until a stable official BoonAI openings surface is verified.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-public-platform-and-recruiter-surfaces-without-exact-company-careers-contract",
  "originalModulePath": "../workbookbatch06/boonai.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\boonai.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
