import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const FLOCK_CATALOG = {
  source: 'flock',
  companyName: 'Flock',
  adapter: 'script',
  homepageUrl: 'https://www.flock.com/',
  homepageCareersLinkUrl: 'https://careers.flock.com/',
  companyCareerPage: 'https://careers.flock.com/',
  companyDomain: 'flock.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-careers-shell-without-public-role-cards',
  extractionStrategy:
    'verified-homepage-careers-link+verified-careers-shell-with-search-controls-and-work-email+verified-no-public-role-cards-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that the live Flock homepage at https://www.flock.com/ links Careers to the first-party careers site at https://careers.flock.com/. Verified that the first-party careers page shows the shell text "Join the Team", filter controls for "All teams" and "All locations", the control label "Search Jobs", and the fallback recruiting contact work@flock.com, but it does not expose visible public role cards, role detail links, or a trustworthy public ATS handoff. No trustworthy public jobs surface is currently available.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default FLOCK_CATALOG
