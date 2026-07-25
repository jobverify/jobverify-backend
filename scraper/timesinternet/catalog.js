import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TIMES_INTERNET_CATALOG = {
  source: 'timesinternet',
  companyName: 'Times Internet',
  officialBrandName: 'Times Internet',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'timesinternet/jobs.json',
  companyCareerPage: 'https://timesinternet.in/careers/job-list',
  officialCareersPageUrl: 'https://timesinternet.in/careers/job-list',
  verifiedJobDetailUrls: [
    'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb',
    'https://timesinternet.in/careers/job-detail/644b66c280bea7e80b7a127c',
  ],
  companyDomain: 'timesinternet.in',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-job-list-page',
  extractionStrategy: 'verified-first-party-job-list+same-domain-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://timesinternet.in/careers/job-list is the live first-party Times Internet careers page and that it publicly lists current roles including Associate Sales, Enterprise Sales Manager, and Manager - Legal with locations in Mumbai, Noida, and Bengaluru. Verified same-domain detail pages such as https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb and https://timesinternet.in/careers/job-detail/644b66c280bea7e80b7a127c expose public job descriptions and Apply now actions on the first-party domain, so this provider is pinned to the verified listing page plus same-domain detail pages.',
}

export default TIMES_INTERNET_CATALOG
