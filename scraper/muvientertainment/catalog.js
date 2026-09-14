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
  "verifiedOn": "2026-09-13",
  "verifiedSurfaceSummary": "Verified September 13, 2026: https://www.muvi.com/career/ links the new first-party /career/job-listings/ inventory, containing six unique roles across two pages. Public /career/jobs/ detail pages validate title, location, description and application job ID. Automation Engineer (Onsite) explicitly lists Bhubaneswar, India. Five Remote roles lack country evidence and are excluded; the one verified India positive carries sourceListingComplete:false to prevent stale-job deletion. Marketing-only pages, missing or repeated pages, malformed cards and unknown-only scope fail closed.",
  "verifiedPublicJobCount": 6,
  "verifiedIndiaJobCount": 1,
  "officialJobListingsUrl": "https://www.muvi.com/career/job-listings/",
  modulePath: path.join(currentDir, 'script.js'),
}

export default MUVI_ENTERTAINMENT_CATALOG
