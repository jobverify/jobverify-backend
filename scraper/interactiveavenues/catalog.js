import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INTERACTIVE_AVENUES_CATALOG = {
  source: 'interactiveavenues',
  companyName: 'Interactive Avenues',
  officialBrandName: 'Interactive Avenues',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  homepageUrl: 'https://www.interactiveavenues.com/',
  officialCareersLandingUrl: 'https://www.interactiveavenues.com/join-us/index.html',
  companyCareerPage: 'https://careers.ipgmediabrands.com/postings/?gh_search=&department=Interactive+Avenues+-+India&interest=&location=India',
  greenhouseBoardEmbedUrl: 'https://boards.greenhouse.io/embed/job_board/js?for=mediabrands',
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'official-first-party-filtered-listing-plus-public-detail-pages',
  extractionStrategy:
    'verified-first-party-careers-handoff+first-party-filtered-job-rows+greenhouse-embedded-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'interactiveavenues.com',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that the official Interactive Avenues careers landing page at https://www.interactiveavenues.com/join-us/index.html links to the filtered first-party Mediabrands jobs page at https://careers.ipgmediabrands.com/postings/?gh_search=&department=Interactive+Avenues+-+India&interest=&location=India, and that the verified filtered page exposed the public role Media: Associate Vice President/Vice President in Bangalore, Bangalore, India with first-party detail route job_id=5105985007 and Greenhouse embed handoff https://boards.greenhouse.io/embed/job_board/js?for=mediabrands.',
  dryRunFile: 'interactiveavenues/jobs.json',
}

export default INTERACTIVE_AVENUES_CATALOG
