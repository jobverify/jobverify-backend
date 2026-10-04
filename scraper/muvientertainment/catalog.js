import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MUVI_ENTERTAINMENT_CATALOG = {
  "source": "muvientertainment",
  "companyName": "Muvi Entertainment",
  "officialBrandName": "Muvi",
  "adapter": "script",
  "homepageUrl": "https://www.muvi.com/",
  "companyCareerPage": "https://www.muvi.com/career/",
  "atsPlatform": "first-party-careers-pagination-plus-job-details",
  "countryFilter": "India",
  "paginationStrategy": "complete-first-party-numbered-listing-pages",
  "extractionStrategy": "verified-first-party-careers-handoff+all-listing-pages+validated-job-details+explicit-india-scope",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "companyDomain": "muvi.com",
  "verifiedOn": "2026-10-03",
  "verifiedSurfaceSummary": "Verified October 3, 2026: the official /career/job-listings/ page lists eight unique roles. Current details use /career/job-listings/<category>/<role>/; the older /career/jobs/<role> detail route remains supported. Detail pages validate title, location, description and application job ID. Automation Engineer (Onsite) explicitly lists Bhubaneswar. Seven Remote roles lack India country evidence and are excluded; the one verified India role carries sourceListingComplete:false to preserve prior vacancies while remote scope is unknown.",
  "verifiedPublicJobCount": 8,
  "verifiedIndiaJobCount": 1,
  "officialJobListingsUrl": "https://www.muvi.com/career/job-listings/",
  modulePath: path.join(currentDir, 'script.js'),
}

export default MUVI_ENTERTAINMENT_CATALOG
