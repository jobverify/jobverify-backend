import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "filo",
  "companyName": "Filo",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-page-plus-public-google-doc-role-descriptions",
  "companyCareerPage": "https://askfilo.com/careers",
  "companyDomain": "askfilo.com",
  "countryFilter": "India",
  "paginationStrategy": "verified-first-party-next-data-payload",
  "extractionStrategy": "verified-first-party-careers-page+next-data-openings-payload+public-google-doc-role-pages",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-08-02",
  "verificationDisposition": "verified-first-party-next-data-openings-payload",
  "verifiedPublicJobCount": 10,
  "verifiedIndiaJobCount": 10,
  "verifiedSurfaceSummary": "Verified on Sunday, August 2, 2026 that https://askfilo.com/careers was the live first-party Filo careers page, that its public __NEXT_DATA__ payload enumerated 10 current openings across departments including Analytics, Engineering, Growth, Product, Creative, and Design, and that each reviewed opening still linked to a public published Google Docs role description. The live public document URLs now include both direct /document/d/e/.../pub and account-scoped /document/u/3/d/e/.../pub variants, and reviewed roles included Business Analyst, Senior Backend Developer, and Senior Product Designer. The public contract still does not disclose per-role city detail or dedicated application handoffs, so this scraper preserves the exact-name India provider scope with null city detail and returns listing-plus-role-description data conservatively from the public documents.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-public-google-doc-role-descriptions",
  "originalModulePath": "../workbookbatch06/filo.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\filo.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
