import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const DEAL_SHARE_CATALOG = {
  source: 'dealshare',
  companyName: 'DealShare',
  adapter: 'script',
  companyCareerPage: 'https://about.dealshare.in/careers',
  homepageUrl: 'https://www.dealshare.in/',
  aboutHubUrl: 'https://about.dealshare.in/',
  directCareersRouteUrl: 'https://about.dealshare.in/careers',
  companyDomain: 'dealshare.in',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-spa-about-hub-plus-access-denied-direct-careers-route',
  extractionStrategy:
    'verified-homepage+verified-spa-about-hub+verified-spa-careers-content-without-openings+verified-direct-careers-route-access-denied-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.dealshare.in/ is the live DealShare homepage and its About Us and Careers links both point to the first-party about hub at https://about.dealshare.in/. Verified by live browser rendering that the about hub exposes client-side routes including https://about.dealshare.in/careers, whose careers content currently contains only employer-branding, culture, testimonial, and contact sections with no public openings, apply links, ATS handoff, or structured JobPosting data. Direct navigation to https://about.dealshare.in/careers returned an AccessDenied response during live checks, so the public careers content is only reachable through the first-party SPA and exposes no trustworthy public jobs surface.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default DEAL_SHARE_CATALOG
