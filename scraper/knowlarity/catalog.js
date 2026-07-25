import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const KNOWLARITY_CATALOG = {
  source: 'knowlarity',
  companyName: 'Knowlarity',
  officialBrandName: 'Knowlarity',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.knowlarity.com/careers',
  homepageUrl: 'https://www.knowlarity.com/',
  companyDomain: 'knowlarity.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-empty-state',
  extractionStrategy:
    'verified-careers-page+embedded-next-data-empty-jobOpening-array+empty-state-email-resume-cta',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'knowlarity/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://www.knowlarity.com/careers is the official first-party Knowlarity careers page, but the visible JOB OPENINGS section only exposes Location and Department dropdowns plus the empty-state CTA EMAIL US YOUR RESUME with Not Matched any profile. The embedded Next.js page data on that same official page contains jobOpening: [], so there is no trustworthy public jobs surface to scrape.',
}

export default KNOWLARITY_CATALOG
