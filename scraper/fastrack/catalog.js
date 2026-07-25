import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.fastrack.in/ is the live first-party Fastrack homepage, that its footer Careers link points to https://careers.titan.in/?rms=titan, and that this handoff resolves to Titan’s first-party careers home at https://careers.titan.in/in/en. Verified https://www.titancompany.in/careers is Titan’s public corporate careers page, explicitly describes careers across Titan brands including Fastrack, and links Current vacancies to https://careers.titan.in/in/en/search-results. Verified the public search shell at https://careers.titan.in/in/en/search-results currently says “Sorry... no active job openings, please come back later.”, so there is no trustworthy public Fastrack-specific jobs feed to scrape.'

export const FASTRACK_CATALOG = {
  source: 'fastrack',
  companyName: 'Fastrack',
  officialBrandName: 'Fastrack',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'fastrack/jobs.json',
  companyCareerPage: 'https://careers.titan.in/?rms=titan',
  companyDomain: 'fastrack.in',
  officialHomepageUrl: 'https://www.fastrack.in/',
  officialCareersHandoffUrl: 'https://careers.titan.in/?rms=titan',
  officialCareersHomeUrl: 'https://careers.titan.in/in/en',
  titanCorporateCareersUrl: 'https://www.titancompany.in/careers',
  officialSearchResultsUrl: 'https://careers.titan.in/in/en/search-results',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'brand-homepage-to-parent-careers-handoff-no-public-fastrack-jobs',
  extractionStrategy:
    'verified-fastrack-homepage+verified-footer-careers-handoff+verified-titan-brand-inclusive-careers-page+verified-titan-jobs-home+verified-zero-results-search-shell-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default FASTRACK_CATALOG
