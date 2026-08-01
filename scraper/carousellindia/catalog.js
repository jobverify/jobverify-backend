import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "carousellindia",
  "companyName": "Carousell India",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-public-smartrecruiters-board-plus-public-jobs-api",
  "companyCareerPage": "https://careers.smartrecruiters.com/CarousellGroup",
  "companyDomain": "careers.smartrecruiters.com",
  "countryFilter": "India",
  "paginationStrategy": "verified-public-jobs-api",
  "extractionStrategy": "verified-public-smartrecruiters-board+public-jobs-api+india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "verified-public-smartrecruiters-jobs-api",
  "verifiedPublicJobCount": 1,
  "verifiedIndiaJobCount": 1,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://careers.smartrecruiters.com/CarousellGroup was the accessible public Carousell Group careers board for this workbook source, that it linked Home Page back to https://careers.carousell.com/, and that the public SmartRecruiters postings API at https://api.smartrecruiters.com/v1/companies/CarousellGroup/postings?limit=100 exposed a current Bengaluru, India opening including iOS intern (6 months internship). Direct fetches to https://careers.carousell.com/ returned a Cloudflare challenge in this environment, so this scraper validates the public SmartRecruiters board and returns India jobs only from the public SmartRecruiters API.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-public-smartrecruiters-board-plus-public-jobs-api",
  "originalModulePath": "../workbookbatch06/carousellindia.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\carousellindia.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
