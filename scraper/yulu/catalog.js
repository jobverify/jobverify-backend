import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "yulu",
  "companyName": "Yulu",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-shell-with-mynexthire-handoff-and-public-listing-error-fail-closed",
  "companyCareerPage": "https://careers.yulu.bike/",
  "companyDomain": "careers.yulu.bike",
  "countryFilter": "India",
  "paginationStrategy": "fail-closed-sentinel",
  "extractionStrategy": "verified-first-party-careers-shell+mynexthire-handoff+public-listing-error-sentinel",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "no-trustworthy-exact-name-public-jobs-flow-verified-locally",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://careers.yulu.bike/ was the live Yulu first-party careers shell, that it embedded the Yulu MyNextHire board at https://yulu.mynexthire.com/employer/jobs/careers, that the public board metadata remained visible at https://yulu.mynexthire.com/employer/jobboard/details_by_shortname/get/yulu/, and that the public requisition list endpoint at https://yulu.mynexthire.com/employer/careers/reqlist/get responded with \"Unable to process your request at this time; please try a little later or contact your administrator!\" instead of a trustworthy enumerable jobs payload. This company-local scraper therefore stays fail-closed and returns no jobs until the public MyNextHire requisition contract becomes trustworthy.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-shell-with-mynexthire-handoff-and-public-listing-error-fail-closed",
  "originalModulePath": "../workbookbatch06/yulu.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\yulu.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
