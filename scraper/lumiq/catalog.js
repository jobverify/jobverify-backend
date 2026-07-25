import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LUMIQ_CATALOG = {
  source: 'lumiq',
  companyName: 'Lumiq',
  officialBrandName: 'LUMIQ',
  adapter: 'script',
  homepageUrl: 'https://www.lumiq.ai/',
  companyCareerPage: 'https://www.lumiq.ai/careers/',
  officialZohoBoardUrl: 'https://lumiq.zohorecruit.in/jobs/Careers',
  jobsApiUrl: 'https://lumiq.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  companyDomain: 'lumiq.ai',
  atsPlatform: 'zohorecruit',
  countryFilter: 'India',
  paginationStrategy: 'zoho-public-job-openings-api',
  extractionStrategy:
    'verified-first-party-careers-page+verified-zohorecruit-board+public-job-openings-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.lumiq.ai/careers/ was the live first-party Lumiq careers page, that it exposed See All Open Positions and Apply For All Open Positions handoffs to https://lumiq.zohorecruit.in/jobs/Careers, and that the public Zoho Recruit surface backed by https://lumiq.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite exposed India-trackable roles including AI Engineer.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default LUMIQ_CATALOG
