import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const GARDEN_REACH_SHIPBUILDERS_CATALOG = {
  source: 'gardenreachshipbuilders',
  companyName: 'Garden Reach Shipbuilders',
  officialBrandName: 'Garden Reach Shipbuilders & Engineers Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'gardenreachshipbuilders/jobs.json',
  homepageUrl: 'https://www.grse.in/',
  companyCareerPage: 'https://www.grse.in/career/',
  verifiedApplyPortalUrls: [
    'https://jobapply.in/grse2026/',
    'https://jobapply.in/grse2025/',
  ],
  companyDomain: 'grse.in',
  atsPlatform: 'official-company-careers-with-linked-public-apply-portal',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-with-notification-date-filter',
  extractionStrategy:
    'verified-homepage+verified-careers-page+numbered-notification-blocks+effective-closing-date-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on August 2, 2026 that https://www.grse.in/ is the live official Garden Reach Shipbuilders & Engineers Limited homepage, that its Careers navigation still points to the first-party public careers page at https://www.grse.in/career/, and that the careers page still exposes Current Job Openings with numbered employment-notification blocks. Verified that the live public careers surface still shows notifications including 2026/03(O), 2025/08(O), and 2025/09(E), and that the verified public apply portals linked from those blocks continue to be https://jobapply.in/grse2026 and https://jobapply.in/grse2025. Verified that the latest visible effective closing date on the trusted surface remains the extended March 31, 2026 date for notification 2026/03(O), while the other visible closing dates are January 9, 2026 and December 31, 2025, so no active public openings remained on August 2, 2026.',
}

export default GARDEN_REACH_SHIPBUILDERS_CATALOG
