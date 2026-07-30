import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PLIVO_CATALOG = {
  source: 'plivo',
  companyName: 'Plivo',
  officialBrandName: 'Plivo',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'plivo/jobs.json',
  homepageUrl: 'https://www.plivo.com/',
  companyCareerPage: 'https://www.plivo.com/jobs/',
  companyDomain: 'plivo.com',
  officialLeverBoardUrl: 'https://jobs.lever.co/plivo',
  leverApiUrl: 'https://api.lever.co/v0/postings/plivo?mode=json',
  verifiedPublicJobCount: 0,
  atsPlatform: 'lever',
  countryFilter: 'Global',
  paginationStrategy: 'official-jobs-shell-validation-plus-lever-api',
  extractionStrategy:
    'verified-first-party-jobs-page+verified-jobs-bundle-lever-fetch+live-empty-lever-board',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-26',
  verifiedSurfaceSummary:
    'Verified on Sunday, July 26, 2026 that https://www.plivo.com/jobs/ is the live official Plivo jobs page, that its Astro JobsPage client bundle fetches the public Lever API at https://api.lever.co/v0/postings/plivo?mode=json, and that the corresponding public Lever board at https://jobs.lever.co/plivo is live but currently empty with the simplified privacy-notice layout that still states "No job postings currently open. Check back later!" and links back to the Plivo homepage. The first-party Plivo page still renders stale "03 open positions" shell copy, while the live Lever API returned [] on the verified date.',
}

export default PLIVO_CATALOG
