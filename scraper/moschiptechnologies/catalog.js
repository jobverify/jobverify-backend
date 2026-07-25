import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MOSCHIP_TECHNOLOGIES_CATALOG = {
  source: 'moschiptechnologies',
  companyName: 'MosChip Technologies',
  officialBrandName: 'MosChip Technologies Limited',
  adapter: 'script',
  homepageUrl: 'https://moschip.com/',
  companyCareerPage: 'https://moschip.com/careers/',
  currentOpeningsUrl: 'https://moschip.com/careers/current-openings/',
  emptyJobArchiveUrl: 'https://moschip.com/job-type/full-time/',
  applicationEmail: 'careers@moschip.com',
  applicationUrl: 'mailto:careers@moschip.com',
  noPublicCareerRouteUrls: [
    'https://moschip.com/jobs/',
    'https://moschip.com/openings/',
  ],
  companyDomain: 'moschip.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'verified-careers-page-plus-current-openings-linkedin-handoff-plus-empty-job-archive-validation',
  extractionStrategy:
    'verified-careers-page+verified-current-openings-linkedin-resume-handoff+verified-empty-job-archive-and-404-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://moschip.com/careers/ is the live first-party careers page and links to https://moschip.com/careers/current-openings/. Verified that the current-openings page tells candidates to "Find Current Openings on..." LinkedIn, invites them to drop a CV via careers@moschip.com, and does not publish trustworthy first-party role cards or job detail pages. Verified that https://moschip.com/job-type/full-time/, https://moschip.com/jobs/, and https://moschip.com/openings/ returned first-party 404 pages. There is no trustworthy public jobs surface for MosChip Technologies on the verified date.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default MOSCHIP_TECHNOLOGIES_CATALOG
