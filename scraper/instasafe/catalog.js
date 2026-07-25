import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INSTASAFE_CATALOG = {
  source: 'instasafe',
  companyName: 'InstaSafe',
  officialBrandName: 'Instasafe Technologies Pvt Ltd',
  adapter: 'script',
  companyCareerPage: 'https://instasafe.com/careers/',
  homepageUrl: 'https://instasafe.com/',
  careersPageUrl: 'https://instasafe.com/careers/',
  careersPortalUrl: 'https://instasafe.zohorecruit.com/jobs/Careers/',
  careersApiUrl:
    'https://instasafe.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  atsPlatform: 'zohorecruit',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-embed-plus-public-zoho-api',
  extractionStrategy: 'official-careers-page+embedded-zohorecruit-site+public-job-openings-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'instasafe.com',
  dryRunFile: 'instasafe/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedPublicPostingCount: 14,
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://instasafe.com/careers/ is the live first-party InstaSafe careers page, that the page embeds the public Zoho Recruit portal at https://instasafe.zohorecruit.com/jobs/Careers/, and that the public jobs API at https://instasafe.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite currently returns 14 public postings.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default INSTASAFE_CATALOG
