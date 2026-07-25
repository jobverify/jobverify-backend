import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LYBRATE_CATALOG = {
  source: 'lybrate',
  companyName: 'Lybrate',
  officialBrandName: 'Lybrate',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'lybrate/jobs.json',
  homepageUrl: 'https://www.lybrate.com/',
  jobsPageUrl: 'https://www.lybrate.com/jobs',
  aboutPageUrl: 'https://www.lybrate.com/about',
  embeddedJobsApiUrl: 'https://api.lever.co/v0/postings/lybrate?group=team&mode=json',
  companyDomain: 'lybrate.com',
  atsPlatform: 'official-jobs-page-with-dead-embedded-api',
  countryFilter: 'India',
  paginationStrategy: 'stale-first-party-jobs-shell-validation',
  extractionStrategy: 'verified-first-party-jobs-page+dead-embedded-api+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://www.lybrate.com/about sends its hiring CTA to the first-party page at https://www.lybrate.com/jobs, that the jobs page still embeds the public Lever URL https://api.lever.co/v0/postings/lybrate?group=team&mode=json, and that the embedded API now returns {"ok":false,"error":"Document not found"} instead of live openings. The same first-party jobs page also exposes doctor-directory footer links such as Dentist in Delhi, so there is no trustworthy live public Lybrate jobs surface to scrape at this time and this provider fails closed with an empty result set.',
}

export default LYBRATE_CATALOG
