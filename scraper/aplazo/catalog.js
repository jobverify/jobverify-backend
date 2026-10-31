import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "aplazo",
  "companyName": "Aplazo",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "ashby",
  "companyDomain": "aplazo.mx",
  "companyCareerPage": "https://www.aplazocareers.mx/",
  "officialHomepageUrl": "https://aplazo.mx/",
  "boardToken": "aplazo",
  "countryFilter": "India",
  "paginationStrategy": "validated-native-single-response",
  "extractionStrategy": "active-exact-employer-careers-ashby-native-role-observations",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": null,
  "verifiedPublicJobCount": null,
  "verifiedIndiaJobCount": null,
  "verifiedSurfaceSummary": "The native collector checks the currently advertised employer careers page and exact case-sensitive Aplazo Ashby tenant. Native observations and full descriptions are retained; complete company/India scope and public counts are unproved.",
  "backfillMode": "native-board-observation",
  "sourceScopeComplete": false,
  "zeroResultPolicy": "evidence-required",
  "originalAdapter": "script",
  "originalAtsPlatform": "workbook-exact-name-sentinel",
  "originalModulePath": "../workbookbatch08/failClosedSentinel.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch08\\aplazo.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
