import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOSTRONK_CATALOG = {
  source: 'sostronk',
  companyName: 'Sostronk',
  adapter: 'script',
  companyCareerPage: 'https://www.sostronk.com/',
  homepageUrl: 'https://www.sostronk.com/',
  changelogUrl: 'https://changelog.sostronk.com/',
  officialBrandName: 'SoStronk',
  coFounderName: 'Karan',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'exact-name-first-party-route-timeout-validation',
  extractionStrategy:
    'search-indexed-first-party-changelog-plus-exact-name-first-party-routes-timeout-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'sostronk.com',
  verifiedOn: '2026-07-17',
  firstPartyTimeoutUrls: [
    'https://www.sostronk.com/',
    'https://www.sostronk.com/about',
    'https://www.sostronk.com/careers',
    'https://www.sostronk.com/jobs',
    'https://www.sostronk.com/contact',
    'https://changelog.sostronk.com/',
  ],
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that search-indexed first-party evidence for SoStronk still included the branded changelog at https://changelog.sostronk.com/ with SoStronk release notes text and the signature Karan, Co-Founder & CTO, but direct probes to https://www.sostronk.com/, https://www.sostronk.com/about, https://www.sostronk.com/careers, https://www.sostronk.com/jobs, https://www.sostronk.com/contact, and https://changelog.sostronk.com/ returned Connect Timeout Error style failures. There is no trustworthy public jobs surface for Sostronk on Friday, July 17, 2026.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default SOSTRONK_CATALOG
