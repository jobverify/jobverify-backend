import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "amberstudent",
  "companyName": "Amberstudent",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "companyCareerPage": "https://amberstudent.com/career",
  "companyDomain": "amberstudent.com",
  "officialJobsBoardUrl": "https://careers.smartrecruiters.com/amberstudent",
  "atsPlatform": "smartrecruiters",
  "countryFilter": "India",
  "paginationStrategy": "official-first-party-page-plus-smartrecruiters-board-and-api",
  "extractionStrategy": "verified-first-party-careers-page+public-smartrecruiters-board+detail-api+india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-30",
  "verifiedPublicJobCount": 1,
  "verifiedIndiaJobCount": 1,
  "smartRecruitersCompanyIdentifier": "amberstudent",
  "smartRecruitersListingApiUrl": "https://api.smartrecruiters.com/v1/companies/amberstudent/postings",
  "smartRecruitersDetailApiUrlTemplate": "https://api.smartrecruiters.com/v1/companies/amberstudent/postings/{{jobId}}",
  "verifiedSurfaceSummary": "Verified on Thursday, July 30, 2026 that https://amberstudent.com/career was the live first-party Amberstudent careers page, that it exposed a Find Roles handoff to the public SmartRecruiters board at https://careers.smartrecruiters.com/amberstudent, and that the public SmartRecruiters board plus postings API returned 1 current India role: Sales Associate in Pune, Maharashtra, India. The verified public detail page was https://jobs.smartrecruiters.com/AmberStudent/743999728950415-sales-associate.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "smartrecruiters",
  "originalModulePath": "../workbookbatch02/amberstudent.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch02\\amberstudent.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
