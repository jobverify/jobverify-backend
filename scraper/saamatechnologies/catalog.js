import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SAAMA_TECHNOLOGIES_CATALOG = {
  source: 'saamatechnologies',
  companyName: 'Saama Technologies',
  officialBrandName: 'Saama',
  adapter: 'script',
  homepageUrl: 'https://www.saama.com/',
  companyCareerPage: 'https://www.saama.com/about/company/careers/',
  jobsBoardUrl: 'https://jobs.jobvite.com/saama/',
  atsPlatform: 'jobvite',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-handoff-plus-single-jobvite-board',
  extractionStrategy: 'verified-first-party-careers-page+jobvite-open-positions-board+india-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'saama.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.saama.com/about/company/careers/ remained the exact first-party Saama careers page, handed applicants to https://jobs.jobvite.com/saama/, and that the public Jobvite board exposed India openings including Senior Site Reliability Engineer, Statistical Programmer, and Inside Sales Associate.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SAAMA_TECHNOLOGIES_CATALOG
