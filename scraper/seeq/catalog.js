import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SEEQ_CATALOG = {
  source: 'seeq',
  companyName: 'Seeq',
  officialBrandName: 'Seeq',
  adapter: 'script',
  homepageUrl: 'https://www.seeq.com/',
  companyCareerPage: 'https://www.seeq.com/careers/',
  workableBoardUrl: 'https://apply.workable.com/seeq/',
  jobsFeedUrl: 'https://apply.workable.com/seeq/jobs.md',
  companyDomain: 'seeq.com',
  atsPlatform: 'first-party-handoff-workable',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-handoff-plus-workable-markdown-feed',
  extractionStrategy:
    'verified-first-party-careers-page+verified-workable-board+workable-markdown-feed+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.seeq.com/careers/ is the official first-party Seeq careers page and that its "See Openings" CTA hands off to the public Workable board at https://apply.workable.com/seeq/. Verified the public board and markdown feed, including current public listings such as Staff Software Engineer - Platform and Principal Customer Success Manager, and confirmed that the verified public surface exposed no India roles on that date. The local provider therefore keeps exact-name coverage through the Workable feed with an India-only location filter.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'seeq/jobs.json',
}

export default SEEQ_CATALOG
