import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ALPHAGREP_CATALOG = {
  source: 'alphagrep',
  companyName: 'AlphaGrep',
  adapter: 'script',
  companyCareerPage: 'https://www.alpha-grep.com/career/',
  companyDomain: 'alpha-grep.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-plus-detail-pages',
  extractionStrategy:
    'verified-homepage-handoff+first-party-career-list+india-detail-pages+inline-apply-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  homepageUrl: 'https://www.alpha-grep.com/',
  careerOpportunityBaseUrl: 'https://www.alpha-grep.com/career-opportunity',
  verifiedIndiaJobUrl: 'https://www.alpha-grep.com/career-opportunity?jid=8176611002',
  verifiedCareers404Urls: [
    'https://www.alpha-grep.com/careers/',
    'https://www.alpha-grep.com/jobs/',
  ],
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.alpha-grep.com/ is the live first-party homepage, that it hands off job seekers to https://www.alpha-grep.com/career/, and that https://www.alpha-grep.com/career-opportunity?jid=8176611002 is a live first-party India job detail page with an inline application form. Verified separately that /careers/ and /jobs/ on the same host are first-party 404 routes rather than the public jobs surface.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ALPHAGREP_CATALOG
